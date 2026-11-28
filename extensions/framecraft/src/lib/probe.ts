import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildExecutionEnv, jellyfinStreamUrl } from "./env";
import { PlaybackProbeResult, RuntimeConfig, SubtitleStreamMeta, VideoColorInfo } from "./types";

import { runCommand as execFileAsync } from "./command-runner";

const BITMAP_SUB_CODECS = new Set([
  "hdmv_pgs_subtitle",
  "pgssub",
  "pgs",
  "dvd_subtitle",
  "dvdsub",
  "dvb_subtitle",
  "dvbsub",
  "xsub",
]);

const MEDIA_EXTENSIONS = new Set([
  ".mkv",
  ".mp4",
  ".m4v",
  ".mov",
  ".m2ts",
  ".ts",
  ".avi",
  ".webm",
  ".wmv",
  ".iso",
  ".img",
]);

/** Blu-ray and container language codes, shown as readable names. */
const LANGUAGE_NAMES: Record<string, string> = {
  zho: "Chinese",
  chi: "Chinese",
  zh: "Chinese",
  cmn: "Mandarin",
  yue: "Cantonese",
  eng: "English",
  en: "English",
  jpn: "Japanese",
  ja: "Japanese",
  kor: "Korean",
  ko: "Korean",
  fra: "French",
  fre: "French",
  fr: "French",
  deu: "German",
  ger: "German",
  de: "German",
  spa: "Spanish",
  es: "Spanish",
  ita: "Italian",
  it: "Italian",
  rus: "Russian",
  ru: "Russian",
  por: "Portuguese",
  pt: "Portuguese",
  tha: "Thai",
  th: "Thai",
  vie: "Vietnamese",
  vi: "Vietnamese",
  ind: "Indonesian",
  nld: "Dutch",
  dut: "Dutch",
  nl: "Dutch",
  swe: "Swedish",
  sv: "Swedish",
  dan: "Danish",
  da: "Danish",
  nor: "Norwegian",
  no: "Norwegian",
  fin: "Finnish",
  fi: "Finnish",
  pol: "Polish",
  pl: "Polish",
  tur: "Turkish",
  tr: "Turkish",
  ara: "Arabic",
  ar: "Arabic",
  heb: "Hebrew",
  he: "Hebrew",
  hin: "Hindi",
  hi: "Hindi",
  ces: "Czech",
  cze: "Czech",
  cs: "Czech",
  hun: "Hungarian",
  hu: "Hungarian",
  ell: "Greek",
  gre: "Greek",
  el: "Greek",
  ukr: "Ukrainian",
  uk: "Ukrainian",
  msa: "Malay",
  may: "Malay",
};

export function subtitleLanguageLabel(language: string): string {
  const key = (language || "").toLowerCase();
  return LANGUAGE_NAMES[key] ?? (key === "und" || !key ? "Unknown language" : key.toUpperCase());
}

export function classifySubtitleStream(
  index: number,
  subOrdinal: number,
  codecRaw: string,
  langRaw: string,
  titleRaw: string,
): SubtitleStreamMeta {
  const codec = (codecRaw || "unknown").toLowerCase();
  const language = (langRaw || "und").toLowerCase();
  // ffprobe reports unknown languages as "und". Surfacing that as the visible
  // title left every untagged track looking identical ("UND (pgssub)") and told
  // the user nothing; name the position and codec instead.
  const title = titleRaw || `Track ${index + 1} (${subtitleLanguageLabel(language)})`;
  const titleLower = title.toLowerCase();

  const isBitmap = BITMAP_SUB_CODECS.has(codec);
  const isChinese =
    ["zho", "chi", "zh", "chs", "cht", "cn", "tw", "hk"].some(
      (code) => language === code || language.startsWith(`${code}-`),
    ) ||
    title.includes("中") ||
    title.includes("简") ||
    title.includes("繁") ||
    title.includes("国") ||
    titleLower.includes("chinese") ||
    titleLower.includes("chs") ||
    titleLower.includes("cht");

  const isEnglish =
    language === "eng" ||
    language === "en" ||
    language.startsWith("en-") ||
    title.includes("英") ||
    titleLower.includes("english");

  return {
    index,
    subOrdinal,
    codec,
    language,
    title,
    isBitmap,
    isChinese,
    isEnglish,
  };
}

async function isProcessRunning(exactOrPattern: string, exact = true): Promise<string | null> {
  try {
    const args = exact ? ["-x", exactOrPattern] : ["-f", exactOrPattern];
    const { stdout } = await execFileAsync("/usr/bin/pgrep", args, { timeout: 1500 });
    const pid = stdout.trim().split(/\s+/)[0];
    return pid || null;
  } catch {
    return null;
  }
}

async function probeIina(): Promise<PlaybackProbeResult | null> {
  const socketPath = "/tmp/framecraft-iina.sock";
  if (!fs.existsSync(socketPath)) return null;
  const values = await new Promise<Record<number, unknown>>((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    const results: Record<number, unknown> = {};
    let pending = "";
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("IINA did not respond in time."));
    }, 2500);
    socket.on("connect", () => {
      ["path", "time-pos", "media-title", "working-directory"].forEach((property, index) => {
        socket.write(JSON.stringify({ command: ["get_property", property], request_id: index + 1 }) + "\n");
      });
    });
    socket.on("data", (data) => {
      pending += data.toString();
      const lines = pending.split("\n");
      pending = lines.pop() || "";
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.request_id) results[response.request_id] = response.data ?? null;
        } catch {
          /* Ignore unrelated events. */
        }
      }
      if (Object.keys(results).length === 4) {
        clearTimeout(timer);
        socket.destroy();
        resolve(results);
      }
    });
    socket.on("error", () => {
      clearTimeout(timer);
      reject(new Error("Could not connect to IINA. Reopen the video and try again."));
    });
  }).catch(() => null);
  if (
    !values ||
    typeof values[1] !== "string" ||
    typeof values[2] !== "number" ||
    !Number.isFinite(values[2]) ||
    values[2] < 0
  )
    return null;
  let mediaTarget = values[1];
  const isRemote = /^https?:\/\//i.test(mediaTarget);
  if (mediaTarget.startsWith("file://")) mediaTarget = fileURLToPath(mediaTarget);
  if (!isRemote && !path.isAbsolute(mediaTarget)) {
    if (typeof values[4] !== "string") return null;
    mediaTarget = path.resolve(values[4], mediaTarget);
  }
  if (!isRemote && !fs.existsSync(mediaTarget)) return null;
  return {
    source: isRemote ? "iina-stream" : "iina-local",
    playerLabel: "IINA",
    movieName: typeof values[3] === "string" ? values[3] : path.basename(mediaTarget),
    mediaTarget,
    isRemote,
    positionSec: Math.max(0, values[2]),
    subtitles: [],
  };
}

async function probeQuickTime(): Promise<PlaybackProbeResult | null> {
  const pid = await isProcessRunning("QuickTime Player", true);
  if (!pid) return null;

  const script = `
    tell application "QuickTime Player"
      if (count of documents) > 0 then
        set frontDoc to front document
        set docPos to (current time of frontDoc as text)
        set docName to (name of frontDoc as text)
        set docPath to ""
        try
          set docPath to POSIX path of (file of frontDoc as alias)
        end try
        return docPos & "|||" & docName & "|||" & docPath
      end if
    end tell
    return ""
  `;

  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], { timeout: 2000 });
    const trimmed = stdout.trim();
    if (!trimmed || !trimmed.includes("|||")) return null;

    const [posStr, docName, docPath] = trimmed.split("|||");
    const positionSec = Number.parseFloat(posStr);
    if (!Number.isFinite(positionSec)) return null;

    const resolvedPath = docPath.trim() || (await findOpenMediaFileByPid(pid));
    if (!resolvedPath || !fs.existsSync(resolvedPath)) return null;

    const movieName = path.basename(docName || resolvedPath, path.extname(docName || resolvedPath));
    return {
      source: "quicktime-local",
      playerLabel: "QuickTime Player",
      movieName,
      mediaTarget: resolvedPath,
      isRemote: false,
      positionSec: Math.max(0, positionSec),
      subtitles: [],
    };
  } catch {
    return null;
  }
}

async function findOpenMediaFileByPid(pid: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", ["-nP", "-Fn", "-p", pid], {
      timeout: 2000,
      maxBuffer: 4 * 1024 * 1024,
    });
    for (const line of stdout.split("\n")) {
      if (!line.startsWith("n/")) continue;
      const filePath = line.slice(1).trim();
      const ext = path.extname(filePath).toLowerCase();
      if (MEDIA_EXTENSIONS.has(ext) && fs.existsSync(filePath)) {
        return filePath;
      }
    }
  } catch {
    // Ignore lsof failures
  }
  return null;
}

function parseClockString(text: string): number | null {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  if (match[3] !== undefined) {
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

async function probeInfuseLocal(): Promise<PlaybackProbeResult | null> {
  const pid = await isProcessRunning("Infuse", true);
  if (!pid) return null;

  const openFile = await findOpenMediaFileByPid(pid);
  if (!openFile) return null;

  // Attempt reading elapsed timestamp via System Events Accessibility if available
  let positionSec: number | null = null;
  const axScript = `
    tell application "System Events"
      if exists process "Infuse" then
        tell process "Infuse"
          try
            set allTexts to value of every static text of front window
            set outStr to ""
            repeat with t in allTexts
              if t is not missing value then
                set outStr to outStr & (t as text) & "\\n"
              end if
            end repeat
            return outStr
          end try
        end tell
      end if
    end tell
    return ""
  `;

  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", axScript], { timeout: 1500 });
    for (const line of stdout.split("\n")) {
      const parsed = parseClockString(line);
      if (parsed !== null && parsed >= 0) {
        positionSec = parsed;
        break;
      }
    }
  } catch {
    // Accessibility permission is optional
  }

  if (positionSec === null) return null;
  return {
    source: "infuse-local",
    playerLabel: "Infuse (Local/SMB)",
    movieName: path.basename(openFile, path.extname(openFile)),
    mediaTarget: openFile,
    isRemote: false,
    positionSec,
    subtitles: [],
  };
}

interface JellyfinMediaStream {
  Type?: string;
  Index?: number;
  Codec?: string;
  Language?: string;
  DisplayTitle?: string;
  Title?: string;
}

interface JellyfinSession {
  UserName?: string;
  Client?: string;
  DeviceName?: string;
  LastActivityDate?: string;
  PlayState?: {
    PositionTicks?: number;
    IsPaused?: boolean;
    MediaSourceId?: string;
  };
  NowPlayingItem?: {
    Id?: string;
    Name?: string;
    Container?: string;
    VideoType?: string;
    Path?: string;
    RunTimeTicks?: number;
    SeriesName?: string;
    ParentIndexNumber?: number;
    IndexNumber?: number;
    MediaStreams?: JellyfinMediaStream[];
    MediaSources?: Array<{
      Container?: string;
      VideoType?: string;
      Path?: string;
      RunTimeTicks?: number;
      Size?: number;
      Bitrate?: number;
      Id?: string;
      MediaStreams?: JellyfinMediaStream[];
    }>;
  };
}

async function probeJellyfin(config: RuntimeConfig): Promise<PlaybackProbeResult | null> {
  if (!config.jellyfinUrl || !config.jellyfinApiKey) return null;

  const env = buildExecutionEnv(config.bypassProxy);
  const identity = `MediaBrowser Client="FrameCraft", Device="macOS", DeviceId="FrameCraftRaycast", Version="1.0.0", Token="${config.jellyfinApiKey}"`;
  // Jellyfin 10.11+ only accepts `Authorization`; Emby expects `X-Emby-Authorization` / `X-Emby-Token`.
  const headerSets = [
    [`Authorization: ${identity}`],
    [`X-Emby-Authorization: ${identity}`, `X-Emby-Token: ${config.jellyfinApiKey}`],
  ];
  const sessionsUrl = `${config.jellyfinUrl}/Sessions`;
  const requestStartedAt = new Date().toISOString();

  try {
    let stdout = "";
    for (let i = 0; i < headerSets.length; i++) {
      try {
        ({ stdout } = await execFileAsync(
          "/usr/bin/curl",
          [
            "-sS",
            "--fail-with-body",
            "--connect-timeout",
            "4",
            "--max-time",
            "12",
            ...headerSets[i].flatMap((header) => ["-H", header]),
            "-H",
            "Accept: application/json",
            sessionsUrl,
          ],
          { env, timeout: 13000, maxBuffer: 8 * 1024 * 1024 },
        ));
        break;
      } catch (error) {
        // curl exits with 22 on HTTP errors; only an auth rejection is worth retrying with the other scheme.
        if (i === headerSets.length - 1 || (error as { code?: number }).code !== 22) throw error;
      }
    }

    const sessions = JSON.parse(stdout) as JellyfinSession[];
    if (!Array.isArray(sessions)) return null;

    let active = sessions.filter((s) => s.NowPlayingItem && s.NowPlayingItem.Id);
    if (config.jellyfinUsername) {
      const targetUser = config.jellyfinUsername.toLowerCase();
      const filtered = active.filter((s) => (s.UserName ?? "").toLowerCase() === targetUser);
      active = filtered;
    }
    if (active.length === 0) return null;

    active.sort((a, b) => (b.LastActivityDate ?? "").localeCompare(a.LastActivityDate ?? ""));
    const session = active[0];
    const item = session.NowPlayingItem!;
    const itemId = item.Id!;
    const ticks = session.PlayState?.PositionTicks;
    if (typeof ticks !== "number" || !Number.isFinite(ticks) || ticks < 0) return null;
    const positionSec = ticks / 10_000_000;

    const mediaSource =
      item.MediaSources?.find((s) => s.Id === session.PlayState?.MediaSourceId) ?? item.MediaSources?.[0];
    const mediaSourceId = session.PlayState?.MediaSourceId || mediaSource?.Id;

    let movieName = item.Name || "Media";
    if (item.SeriesName) {
      const sNum = item.ParentIndexNumber !== undefined ? `S${String(item.ParentIndexNumber).padStart(2, "0")}` : "";
      const eNum = item.IndexNumber !== undefined ? `E${String(item.IndexNumber).padStart(2, "0")}` : "";
      const epTag = sNum || eNum ? `_${sNum}${eNum}` : "";
      movieName = `${item.SeriesName}${epTag}_${movieName}`;
    }

    const rawStreams = mediaSource?.MediaStreams ?? item.MediaStreams ?? [];
    const subtitles: SubtitleStreamMeta[] = [];
    let subOrd = 0;
    for (const st of rawStreams) {
      if (st.Type === "Subtitle" && typeof st.Index === "number") {
        subtitles.push(
          classifySubtitleStream(
            st.Index,
            subOrd,
            st.Codec ?? "unknown",
            st.Language ?? "und",
            st.DisplayTitle ?? st.Title ?? `Track ${st.Index}`,
          ),
        );
        subOrd += 1;
      }
    }

    const streamUrl = jellyfinStreamUrl(config.jellyfinUrl, config.jellyfinApiKey, itemId, mediaSourceId);

    const clientName = session.Client ? `${session.Client} · Jellyfin/Emby` : "Jellyfin/Emby";
    return {
      playbackObservation: {
        requestStartedAt,
        responseAt: new Date().toISOString(),
        capturedAt: new Date().toISOString(),
        reportedAt: session.LastActivityDate,
        isPaused: session.PlayState?.IsPaused,
        client: session.Client,
        device: session.DeviceName,
      },
      durationSec: (mediaSource?.RunTimeTicks || item.RunTimeTicks || 0) / 10_000_000 || undefined,
      sizeBytes: mediaSource?.Size && mediaSource.Size > 0 ? mediaSource.Size : undefined,
      bitrateBps: mediaSource?.Bitrate && mediaSource.Bitrate > 0 ? mediaSource.Bitrate : undefined,
      container: /^(iso|bluray|dvd)$/i.test(mediaSource?.VideoType || item.VideoType || "")
        ? "iso"
        : /\.(iso|img)$/i.test(mediaSource?.Path || item.Path || "")
          ? "iso"
          : mediaSource?.Container || item.Container || path.extname(mediaSource?.Path || item.Path || "").slice(1),
      source: "jellyfin-remote",
      playerLabel: clientName,
      movieName,
      mediaTarget: streamUrl,
      isRemote: true,
      positionSec,
      itemId,
      mediaSourceId,
      subtitles,
    };
  } catch {
    throw new Error(
      "Could not reach the Jellyfin/Emby server. Check the server URL and API key (it must be allowed to read sessions), or try again if the network is slow.",
    );
  }
}

export async function detectActivePlayback(config: RuntimeConfig): Promise<PlaybackProbeResult | null> {
  // 1. Local / Direct players first (instant <50ms check)
  const iina = await probeIina();
  if (iina) return iina;

  const qt = await probeQuickTime();
  if (qt) return qt;

  // 2. Jellyfin / Emby active session (handles Infuse / Swiftfin / Web / Apple TV sessions)
  const jf = await probeJellyfin(config);
  if (jf) return jf;

  // 3. Offline / Local / SMB Infuse fallback via open file descriptor probe
  const infuseLocal = await probeInfuseLocal();
  if (infuseLocal) return infuseLocal;

  throw new Error(
    config.jellyfinUrl && config.jellyfinApiKey
      ? "No matching playback session on the Jellyfin/Emby server. Start playing first; if you set a user name, check it matches exactly. For IINA, enable its IPC socket first (see README)."
      : "Nothing is playing in IINA, and no Jellyfin/Emby server is configured. Add the server URL and API key in the extension preferences, or enable IINA's IPC socket (see README).",
  );
}

interface FfprobeStream {
  id?: string;
  index: number;
  codec_type: string;
  codec_name?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  color_space?: string;
  color_transfer?: string;
  color_primaries?: string;
  tags?: Record<string, string>;
}

export async function inspectContainerMetadata(
  ffprobePath: string,
  mediaPathOrUrl: string,
  bypassProxy: boolean,
  timeoutMs = 20_000,
): Promise<{ colorInfo: VideoColorInfo; subtitles: SubtitleStreamMeta[] }> {
  const env = buildExecutionEnv(bypassProxy);
  const isRemote = /^https?:\/\//i.test(mediaPathOrUrl);
  const args = [
    "-v",
    "error",
    ...(isRemote ? ["-reconnect", "1", "-reconnect_streamed", "1"] : []),
    "-probesize",
    "10M",
    "-analyzeduration",
    "10M",
    "-show_entries",
    "stream=id,index,codec_type,codec_name,width,height,pix_fmt,color_space,color_transfer,color_primaries:stream_tags=language,title",
    "-of",
    "json",
    mediaPathOrUrl,
  ];

  const { stdout } = await execFileAsync(ffprobePath, args, {
    env,
    timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024,
  });

  const parsed = JSON.parse(stdout) as { streams?: FfprobeStream[] };
  const streams = parsed.streams ?? [];

  const video = streams.find((s) => s.codec_type === "video");
  const colorTransfer = video?.color_transfer;
  const colorPrimaries = video?.color_primaries;
  const isPq = colorTransfer === "smpte2084";
  // Bit depth alone does not make a source HDR: 10-bit ProRes/DNxHR masters and
  // SDR BT.709 10-bit files are common. Only transfer characteristics decide,
  // with BT.2020 primaries as an extra signal when the transfer tag is missing.
  const isHdr =
    isPq || colorTransfer === "arib-std-b67" || (colorTransfer === undefined && colorPrimaries === "bt2020");

  const colorInfo: VideoColorInfo = {
    width: video?.width || 1920,
    height: video?.height || 1080,
    pixFmt: video?.pix_fmt || "yuv420p",
    colorSpace: video?.color_space,
    colorTransfer,
    colorPrimaries,
    isHdr,
    isPq,
  };

  const subtitles: SubtitleStreamMeta[] = [];
  let subOrd = 0;
  for (const st of streams) {
    if (st.codec_type === "subtitle") {
      const lang = st.tags?.language ?? st.tags?.LANGUAGE ?? "und";
      // Omit the fallback title so classifySubtitleStream can name the track by
      // position; "UND (pgssub)" was shown for every untagged track.
      const tagged = st.tags?.title ?? st.tags?.TITLE;
      const title = tagged || "";
      const subtitle = classifySubtitleStream(st.index, subOrd, st.codec_name ?? "unknown", lang, title);
      if (st.id) subtitle.pid = Number(st.id);
      subtitles.push(subtitle);
      subOrd += 1;
    }
  }

  return { colorInfo, subtitles };
}
