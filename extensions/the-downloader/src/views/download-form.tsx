import { useEffect, useMemo, useRef, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Keyboard,
  Toast,
  environment,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showHUD,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Video } from "../types.js";
import { detectSource } from "../lib/detect.js";
import {
  Filetype,
  LinkProbe,
  chooseFiletype,
  defaultFiletype,
  filetypeGuidance,
  installedAlternatives,
  isMarkdownMode,
  probedFiletypes,
  probesWithYtdlp,
  requiredTools,
  resolveTool,
  saveModeLabel,
} from "../lib/filetype.js";
import { composeVideoFormat } from "../lib/video-format.js";
import {
  LiveStreamError,
  PLAYLIST_PICK_LIMIT,
  PlaylistInfo,
  suffixedTemplateIn,
  fetchPlaylist,
  fetchVideoInfo,
  isLiveStream,
  isPlaylistProbe,
  outputTemplateIn,
  playlistTemplateIn,
  runThumbnailDownload,
  runVideoDownload,
} from "../lib/ytdlp.js";
import { clipLabel, clipSuffix, parseClip } from "../lib/clip.js";
import { audioLanguages, languageSuffix, takesAudioLanguage } from "../lib/audio-language.js";
import { parseSubtitleValue, subtitleTracks, subtitleValue } from "../lib/subtitles.js";
import { getVideoExtras } from "../lib/config.js";
import { ensureFreshTools, hintOutdatedTool } from "../lib/tool-updates.js";
import { uniqueFilePath } from "../lib/unique-path.js";
import { GalleryDownloadError, isLoginRequiredError, runGalleryDownload } from "../lib/gallerydl.js";
import { resolveBrowser } from "../lib/browsers.js";
import { AbortError, errorSummary, isNoMediaError } from "../lib/run.js";
import { needsRosetta, RosettaRequiredError } from "../lib/managed-binary.js";
import { runSpotdlDownload, SpotdlDownloadError } from "../lib/spotdl.js";
import { ABOUT_URL, SPOTDL_SETUP_GUIDE_URL, SUPPORTED_SITES_URL } from "../lib/docs.js";
import { reserveWebpagePath, runMonolithSave } from "../lib/monolith.js";
import {
  MarkdownSaveResult,
  archiveNote,
  imagesNote,
  loadPageMarkdown,
  obsidianUrl,
  savePageAsMarkdown,
} from "../lib/page-markdown.js";
import { DownloadInit, DownloadSession, trackRunningDownload } from "../lib/download-session.js";
import { entryFromSnapshot, recordDownload } from "../lib/history.js";
import { QUALITY_VALUES, QualityValue, estimateQuality, maxHeight, qualityTitle } from "../lib/estimate.js";
import { formatCount, qualityName } from "../lib/media-info.js";
import { formatClock, plural, progressMessage } from "../lib/format.js";
import extractTranscript from "../transcript.js";
import {
  downloadPath,
  getDenoPath,
  getFormatTitle,
  getFormatValue,
  getGalleryDlPath,
  getIdleTimeoutMs,
  getMonolithPath,
  getSpotdlPath,
  getVideoFormats,
  getffmpegPath,
  getffprobePath,
  getytdlPath,
  isValidUrl,
  markdownPath,
  normalizeUrl,
  sanitizeVideoTitle,
} from "../utils.js";
import { DownloadView } from "./download-view.js";
import { DownloadHistory, HISTORY_SHORTCUT } from "./history-view.js";
import { ChatAboutLinkAction } from "./chat-action.js";
import { MediaPreview } from "./media-preview.js";
import Installer from "./installer.js";
import Updater from "./updater.js";
import { Doctor } from "./doctor.js";

// Rendered only by the Download command, so it also sees that command's own settings (Exact Format Selection).
const prefs = getPreferenceValues<Preferences.Index>();

/** Required-tool name → its filesystem-path resolver. */
const TOOL_PATH: Record<string, () => string> = {
  "yt-dlp": getytdlPath,
  ffmpeg: getffmpegPath,
  ffprobe: getffprobePath,
  deno: getDenoPath,
  "gallery-dl": getGalleryDlPath,
  spotdl: getSpotdlPath,
  monolith: getMonolithPath,
};

const FILETYPE_TITLE: Record<Filetype, string> = {
  video: "Video",
  audio: "Audio",
  image: "Image",
  transcript: "Transcript",
  website: "Website",
};

const FILETYPE_ICON: Record<Filetype, Icon> = {
  video: Icon.Video,
  audio: Icon.Music,
  image: Icon.Image,
  transcript: Icon.Document,
  website: Icon.Globe,
};

const QUALITY_TITLE: Record<string, string> = {
  best: "Best",
  "1080": "1080p",
  "720": "720p",
  "480": "480p",
  smallest: "Smallest",
};

const FORMAT_TITLE: Record<string, string> = {
  mp4: "MP4",
  mkv: "MKV",
  webm: "WebM",
  mp3: "MP3",
  m4a: "M4A",
  opus: "Opus",
  flac: "FLAC",
  wav: "WAV",
};

const formatTitle = (value: string) => FORMAT_TITLE[value] ?? value.toUpperCase();

/**
 * Mirror a finished toast onto the download view and record it in the history.
 * `list` is for a playlist: how many videos it saved, and the folder they are in.
 */
function succeedSession(
  session: DownloadSession,
  toast: Toast,
  filePath?: string,
  list?: { items: number; folder: string },
) {
  session.succeed({ filePath: filePath || undefined, title: toast.title, message: toast.message, ...list });
  void recordDownload(entryFromSnapshot(session.getSnapshot()));
}

/** Mirror a failure toast (after `failToast` or a custom one) onto the download view and record it. */
function failSession(session: DownloadSession, toast: Toast, error?: unknown) {
  session.fail({ title: toast.title, message: toast.message, cancelled: error instanceof AbortError });
  void recordDownload(entryFromSnapshot(session.getSnapshot()));
}

/**
 * Turn a rejected runner into a red, copyable failure toast — or a neutral
 * "Cancelled" toast when the user pressed Stop. Returns true for a plain tool
 * failure (not a cancel or a specially handled error), where an outdated-tool
 * hint makes sense.
 */
function failToast(toast: Toast, error: unknown): boolean {
  // Clear the in-flight "Stop" action up front — every failure path below
  // either sets its own actions or wants none, and a dead Stop button left
  // over from startAbortable would do nothing.
  toast.primaryAction = undefined;
  toast.secondaryAction = undefined;
  if (error instanceof AbortError) {
    toast.style = Toast.Style.Failure;
    toast.title = "Cancelled";
    toast.message = undefined;
    return false;
  }
  if (error instanceof LiveStreamError) {
    // Not a tool problem, so no "update yt-dlp" hint.
    toast.style = Toast.Style.Failure;
    toast.title = error.message;
    toast.message = "Try again once the stream has ended.";
    return false;
  }
  if (error instanceof RosettaRequiredError) {
    toast.style = Toast.Style.Failure;
    toast.title = "spotDL needs Rosetta 2";
    toast.message = error.message;
    return false;
  }
  if (error instanceof SpotdlDownloadError) {
    const partial =
      error.tracks > 0 ? `Downloaded ${error.tracks} track${error.tracks === 1 ? "" : "s"} before failure. ` : "";
    toast.style = Toast.Style.Failure;
    toast.title = error.summary.title;
    toast.message = partial + error.summary.message;
    toast.primaryAction = { title: "Copy Full Error", onAction: () => Clipboard.copy(error.rawOutput) };
    if (error.summary.action === "open-preferences") {
      toast.secondaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
    } else if (error.summary.action === "open-setup-guide") {
      toast.secondaryAction = { title: "Open Setup Guide", onAction: () => open(SPOTDL_SETUP_GUIDE_URL) };
    }
    return false;
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  // gallery-dl fails the whole run when only some items do: say what was saved.
  const saved =
    error instanceof GalleryDownloadError && error.files > 0
      ? `${error.files} file${error.files === 1 ? "" : "s"} saved before the failure. `
      : "";
  toast.style = Toast.Style.Failure;
  toast.title = "Download Failed";
  // The toast shows the error itself; Copy Error keeps everything the tool printed.
  toast.message = saved + errorSummary(message);
  toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(message) };
  return true;
}

/** Put the page's article on the clipboard as Markdown, without saving a file. */
async function copyPageAsMarkdown(url: string) {
  const controller = new AbortController();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Reading Page",
    primaryAction: { title: "Stop", onAction: () => controller.abort() },
  });
  try {
    const page = await loadPageMarkdown(url, { signal: controller.signal });
    await Clipboard.copy(page.markdown);
    toast.style = Toast.Style.Success;
    toast.title = "Copied as Markdown";
    toast.message = [page.title, archiveNote(page.archive)].filter(Boolean).join(" · ");
    toast.primaryAction = undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast.style = Toast.Style.Failure;
    toast.title = error instanceof AbortError ? "Cancelled" : "Couldn't Read the Page";
    toast.message = error instanceof AbortError ? undefined : errorSummary(message);
    toast.primaryAction =
      error instanceof AbortError ? undefined : { title: "Copy Error", onAction: () => Clipboard.copy(message) };
  }
}

type DownloadFormProps = {
  initialUrl: string;
  /** The Clip field's text, for a link opened with a moment to download. */ initialClip?: string;
};

export function DownloadForm({ initialUrl, initialClip }: DownloadFormProps) {
  const audioPreferred = prefs.videoMediaType === "audio";
  const { push } = useNavigation();

  const [url, setUrl] = useState(initialUrl);
  const [pickedFiletype, setFiletype] = useState<Filetype>(() =>
    isValidUrl(initialUrl) ? defaultFiletype(detectSource(initialUrl), audioPreferred) : "video",
  );
  const [filetypeTouched, setFiletypeTouched] = useState(false);
  // Controlled so the Quality size estimates follow the chosen container.
  const [container, setContainer] = useState<string>(prefs.videoContainer);
  // Controlled because the Markdown mode needs no monolith: the tool check follows it.
  const [saveMode, setSaveMode] = useState<string>(prefs.webpageSaveMode);
  // Controlled so a mistyped time shows under the field, and so a new link starts without the last one's clip.
  const [clipText, setClipText] = useState(initialClip ?? "");
  const [refresh, setRefresh] = useState(0);
  // Ref (not state) so a rapid second submit sees the flag synchronously — a
  // re-render would race with the click. Refs update inside the same event
  // loop turn that set them.
  const submitInFlight = useRef(false);
  // Controller for the in-flight runner. Set on submit, used by the Stop
  // toast action AND by the component-unmount cleanup so a dismissed form
  // does not leave zombie yt-dlp / gallery-dl / monolith / spotdl children
  // attached to the user's Raycast process.
  const activeAbort = useRef<AbortController | null>(null);
  // The running download's live view, so a second submit can bring it back
  // (with its Stop action) instead of covering its toast with an error.
  const activeSession = useRef<DownloadSession | null>(null);
  // Controller for the metadata (--dump-json) fetch. usePromise replaces this on
  // every re-run and aborts the prior one, so editing the URL or dismissing the
  // form kills the in-flight yt-dlp metadata child instead of orphaning it.
  const metaAbortable = useRef<AbortController>(null);
  // The same for the playlist's list of videos.
  const listAbortable = useRef<AbortController>(null);

  useEffect(() => {
    return () => {
      activeAbort.current?.abort();
    };
  }, []);

  /**
   * Wire an AbortController to a toast: returns the signal for the runner
   * options and a `done()` to call on completion. The toast's first action
   * becomes "Stop Download", which aborts the in-flight child, and the
   * controller is tracked so unmount cleanup can kill anything still running.
   */
  function startAbortable(toast: Toast, session?: DownloadSession): { signal: AbortSignal; done: () => void } {
    const controller = new AbortController();
    activeAbort.current = controller;
    const untrack = trackRunningDownload(controller);
    toast.primaryAction = { title: "Stop Download", onAction: () => controller.abort() };
    session?.onStop(() => controller.abort());
    return {
      signal: controller.signal,
      done: () => {
        untrack();
        if (activeAbort.current === controller) activeAbort.current = null;
      },
    };
  }

  const validUrl = isValidUrl(url);
  const source = useMemo(() => detectSource(url), [url]);

  // Probe every link whose source has yt-dlp filetypes — whatever is picked —
  // so the Filetype dropdown offers only what this link can give: no Video for
  // an audio-only track, no Transcript without captions, only Website for a
  // page with no media (a Wikipedia article). Deno is optional here: without
  // it a YouTube probe may fail, which only leaves the options unfiltered.
  const shouldFetchMeta = useMemo(
    () => validUrl && probesWithYtdlp(source) && fs.existsSync(getytdlPath()),
    [validUrl, source, refresh],
  );

  const {
    data: probed,
    isLoading: metaLoading,
    revalidate: refetchMeta,
  } = usePromise(
    async (u: string, fetchIt: boolean): Promise<{ url: string; video?: Video; error?: Error } | undefined> => {
      if (!fetchIt) return undefined;
      const denoPath = getDenoPath();
      try {
        const data = await fetchVideoInfo(
          getytdlPath(),
          u,
          prefs.forceIpv4,
          fs.existsSync(denoPath) ? denoPath : undefined,
          {
            signal: metaAbortable.current?.signal,
            timeoutMs: getIdleTimeoutMs(),
            // Browser logins only for a known video site. Any other page is
            // probed too — whatever is picked — and reading the browser's cookie
            // store for every pasted article would bring up its Keychain prompt.
            cookiesFromBrowser: detectSource(u) === "video" ? getVideoExtras().cookiesFromBrowser : undefined,
          },
        );
        return { url: u, video: { ...data, title: sanitizeVideoTitle(data.title) } };
      } catch (error) {
        if (error instanceof AbortError) throw error;
        return { url: u, error: error instanceof Error ? error : new Error(String(error)) };
      }
    },
    [url, shouldFetchMeta],
    { onError: () => undefined, abortable: metaAbortable },
  );
  // Only this link's finished probe counts: while a new one runs, `probed` is the previous link's.
  const probe = shouldFetchMeta && !metaLoading && probed?.url === url ? probed : undefined;
  const video = probe?.video;
  const probeFailure = probe?.error;
  const noMedia = !!probeFailure && isNoMediaError(probeFailure.message);
  const linkProbe: LinkProbe | undefined = video
    ? { kind: "media", video }
    : noMedia
      ? { kind: "no-media" }
      : undefined;
  const { options: filetypeOptions, unavailable } = probedFiletypes(source, linkProbe);

  // Keep Filetype valid for the URL: the source default until the user picks
  // one, and even then a type this link offers (e.g. Video was picked, then a
  // Pinterest link is pasted, which only supports Image). Derived on every
  // render — an effect lagged one render behind a new link, so the dropdown
  // briefly held a type the link doesn't offer.
  const filetype = !validUrl
    ? pickedFiletype
    : chooseFiletype(
        filetypeOptions,
        filetypeTouched ? pickedFiletype : undefined,
        defaultFiletype(source, audioPreferred),
      );
  const ytdlpBound = resolveTool(source, filetype) === "yt-dlp";

  // A playlist or channel link (the probe read its first video): list its
  // videos, so some can be picked instead of downloading all of them.
  const playlistLink = isPlaylistProbe(video);
  const { data: listed, isLoading: listLoading } = usePromise(
    async (u: string, fetchIt: boolean): Promise<{ url: string; list?: PlaylistInfo } | undefined> => {
      if (!fetchIt) return undefined;
      const denoPath = getDenoPath();
      try {
        const list = await fetchPlaylist(
          getytdlPath(),
          u,
          prefs.forceIpv4,
          fs.existsSync(denoPath) ? denoPath : undefined,
          {
            signal: listAbortable.current?.signal,
            timeoutMs: getIdleTimeoutMs(),
            cookiesFromBrowser: detectSource(u) === "video" ? getVideoExtras().cookiesFromBrowser : undefined,
          },
        );
        return { url: u, list };
      } catch (error) {
        if (error instanceof AbortError) throw error;
        // Without the list the whole playlist is downloaded, as the form says then.
        return { url: u };
      }
    },
    [url, playlistLink],
    { onError: () => undefined, abortable: listAbortable },
  );
  const listReady = playlistLink && !listLoading && listed?.url === url;
  const playlist = listReady ? listed?.list : undefined;
  // Video and Audio take the playlist; Transcript and Image read its first video.
  const asPlaylist = playlistLink && ytdlpBound && (filetype === "video" || filetype === "audio");

  // The required tools must all exist; otherwise the form is replaced by the Installer.
  const missingTool = useMemo(
    () =>
      validUrl
        ? requiredTools(source, filetype, url, saveMode).find((name) => !fs.existsSync(TOOL_PATH[name]()))
        : undefined,
    [source, filetype, url, validUrl, saveMode, refresh],
  );
  // Outdated tools are the usual cause of failed downloads (yt-dlp's HTTP 403s,
  // gallery-dl's broken extractors), so the first time the form needs a set of
  // tools, check them, offer to update, and re-fetch the metadata once an update
  // lands. The metadata fetch itself doesn't wait for the answer.
  const checkedTools = useRef(new Set<string>());
  useEffect(() => {
    if (!validUrl || missingTool) return;
    const tools = requiredTools(source, filetype, url, saveMode);
    const key = tools.join(",");
    if (tools.length === 0 || checkedTools.current.has(key)) return;
    checkedTools.current.add(key);
    void ensureFreshTools(tools).then((outcome) => {
      if (outcome === "updated") refetchMeta();
    });
  }, [validUrl, missingTool, source, filetype, url, saveMode, refetchMeta]);

  // Only the current URL's metadata counts: while a new one loads, `video` is the
  // previous link's. A live link submitted before its probe ends is still refused
  // by yt-dlp itself (see `buildVideoDownloadArgs`).
  // A playlist whose first video is live still has the others (yt-dlp skips the live one).
  const liveStream = !metaLoading && !!video && isLiveStream(video) && !asPlaylist;

  /** Start a download view for this submit. yt-dlp metadata, when fetched, fills in the title and details. */
  function openSession(
    init: Omit<DownloadInit, "title" | "meta">,
    withMeta: boolean,
    /** A playlist is shown under its own name, not its first video's title and length. */
    listTitle?: string,
  ): DownloadSession {
    // While a new URL's metadata is still loading, `video` belongs to the previous URL.
    const meta = withMeta && !metaLoading ? video : undefined;
    const session = new DownloadSession({
      ...init,
      title: listTitle ?? meta?.title,
      meta: meta
        ? {
            uploader: meta.uploader ?? meta.channel ?? undefined,
            duration: listTitle ? undefined : meta.duration || undefined,
            thumbnail: meta.thumbnail ?? undefined,
            source: meta.extractor_key ?? undefined,
          }
        : undefined,
    });
    activeSession.current = session;
    push(<DownloadView session={session} />);
    return session;
  }

  if (missingTool) {
    // Other types that work with what's installed, so a missing tool doesn't trap
    // the user — e.g. an unknown site defaults to Website, but Video may work.
    const alternatives = installedAlternatives(source, filetype, url, (tool) => fs.existsSync(TOOL_PATH[tool]()));
    // A webpage can always be saved as Markdown: that mode needs no monolith.
    const markdownInstead = filetype === "website" && !isMarkdownMode(saveMode);
    return (
      <Installer
        executable={missingTool}
        onRefresh={() => setRefresh((r) => r + 1)}
        alternatives={
          alternatives.length > 0 || markdownInstead ? (
            <>
              {markdownInstead && (
                <Action
                  title="Save as Markdown Instead"
                  icon={Icon.Document}
                  onAction={() => setSaveMode("markdown")}
                />
              )}
              {alternatives.map((ft) => (
                <Action
                  key={ft}
                  title={`Download as ${FILETYPE_TITLE[ft]} Instead`}
                  icon={FILETYPE_ICON[ft]}
                  onAction={() => {
                    setFiletypeTouched(true);
                    setFiletype(ft);
                  }}
                />
              ))}
            </>
          ) : undefined
        }
      />
    );
  }

  // The adaptive status line, plus a details line once yt-dlp metadata is in.
  let statusLabel = "Status";
  let statusText = "Paste a link to download.";
  let detailsText = "";
  const metaReady = ytdlpBound && !!video && !metaLoading;
  const listTitle = playlist?.title ?? video?.playlist_title ?? video?.playlist ?? "Playlist";
  if (validUrl) {
    // While a new URL's metadata loads, `video` still belongs to the previous URL.
    if (metaReady && video && asPlaylist) {
      statusLabel = "Playlist";
      statusText = listTitle;
      const count = playlist?.lists
        ? `${playlist.lists.length} lists`
        : playlist
          ? playlist.truncated
            ? `more than ${PLAYLIST_PICK_LIMIT} videos`
            : plural(playlist.entries.length, "video")
          : video.playlist_count
            ? plural(video.playlist_count, "video")
            : undefined;
      detailsText = [video.uploader ?? video.channel, count, "saved into a folder of its own"]
        .filter(Boolean)
        .join(" · ");
    } else if (metaReady && video) {
      statusLabel = "Title";
      statusText = video.title;
      const best = qualityName(maxHeight(video));
      const views = formatCount(video.view_count);
      detailsText = [
        video.uploader ?? video.channel,
        video.duration ? formatClock(video.duration) : undefined,
        views ? `${views} views` : undefined,
        best ? `up to ${best}` : undefined,
      ]
        .filter(Boolean)
        .join(" · ");
    } else if (shouldFetchMeta && metaLoading) {
      statusText = ytdlpBound ? "Fetching details…" : "Checking what this link offers…";
    } else if (noMedia) {
      statusText = "No video or audio on this page, so it can only be saved as a webpage.";
    } else if (probeFailure && ytdlpBound) {
      statusText = `Couldn't read this link's details: ${errorSummary(probeFailure.message, 200)} The download may still work.`;
    } else if (video && !ytdlpBound && filetypeOptions.some((ft) => resolveTool(source, ft) === "yt-dlp")) {
      statusText = `This page has a video${video.title ? ` (“${video.title}”)` : ""}. Choose it under Filetype to download it.`;
    } else if (ytdlpBound) {
      statusText = "Ready to download.";
    } else {
      // gallery / spotify / webpage — explain what this source supports and why.
      statusText = filetypeGuidance(source);
    }
  }

  // What the Filetype info says: the source's guidance until the probe is in,
  // then what this link offers and why the rest isn't there.
  const unavailableNote = unavailable.length
    ? `Not available for this link: ${unavailable.map((u) => `${FILETYPE_TITLE[u.filetype]} (${u.reason})`).join(", ")}.`
    : "";
  const filetypeInfo = noMedia
    ? "yt-dlp finds no video or audio on this page, so it can only be saved as a webpage."
    : video
      ? ["These options were checked against this link.", unavailableNote].filter(Boolean).join(" ")
      : filetypeGuidance(source);

  // A playlist's sizes can't be told from its first video.
  const estimates =
    metaReady && video && !asPlaylist
      ? (Object.fromEntries(QUALITY_VALUES.map((q) => [q, estimateQuality(video, q, container)])) as Record<
          QualityValue,
          ReturnType<typeof estimateQuality>
        >)
      : undefined;

  // Part of one video, or a caption track of it: neither applies to a whole playlist.
  const mediaFiletype = ytdlpBound && (filetype === "video" || filetype === "audio");
  const { clip, error: clipError } = mediaFiletype && !asPlaylist ? parseClip(clipText, video?.duration) : {};
  const tracks = metaReady && video && !playlistLink ? subtitleTracks(video) : [];
  // The soundtracks of a video that has several (dubbed audio); empty for the usual single one.
  const soundtracks = metaReady && video && !playlistLink ? audioLanguages(video) : [];

  const toMarkdownFolder = filetype === "website" && isMarkdownMode(saveMode) && markdownPath !== downloadPath;

  const urlError =
    url && !validUrl
      ? "Enter a valid URL"
      : liveStream && (filetype === "video" || filetype === "audio" || filetype === "transcript")
        ? "Live streams are not supported"
        : undefined;

  async function handleSubmit(values: Form.Values) {
    // Reject re-entrant submits while a download is in flight — a double-press
    // of ⌘⏎ would otherwise fire two downloads to the same output template,
    // racing for the same file and corrupting both.
    if (submitInFlight.current) {
      // Back to the running download's live view: a new toast here would replace
      // its progress toast, the only Stop control left once the view was closed.
      if (activeSession.current) push(<DownloadView session={activeSession.current} />);
      else await showToast({ style: Toast.Style.Failure, title: "A download is already running" });
      return;
    }
    const rawUrl = String(values.url ?? "").trim();
    // No Filetype means the form judged the link invalid and hid its fields.
    if (!isValidUrl(rawUrl) || !values.filetype) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid URL" });
      return;
    }
    // Prefix https:// for scheme-less input before any runner sees it (monolith
    // treats a bare host as a local file path).
    const submitUrl = normalizeUrl(rawUrl);
    const ft = values.filetype as Filetype;
    const src = detectSource(submitUrl);
    const folder = (values.destination as string[] | undefined)?.[0] ?? downloadPath;

    if (liveStream && (ft === "video" || ft === "audio" || ft === "transcript")) {
      await showToast({ style: Toast.Style.Failure, title: "Live streams are not supported" });
      return;
    }
    if (clipError) {
      await showToast({ style: Toast.Style.Failure, title: "Clip", message: clipError });
      return;
    }
    // Not yet: with no list to pick from, this would start the whole playlist.
    if (asPlaylist && !listReady) {
      await showToast({ style: Toast.Style.Failure, title: "Still listing the playlist's videos…" });
      return;
    }

    submitInFlight.current = true;
    try {
      await runSubmit(submitUrl, ft, src, folder, values);
    } finally {
      submitInFlight.current = false;
      activeSession.current = null;
    }
  }

  async function runSubmit(
    submitUrl: string,
    ft: Filetype,
    src: ReturnType<typeof detectSource>,
    folder: string,
    values: Form.Values,
  ) {
    if (ft === "website") {
      const mode = String(values.saveMode ?? prefs.webpageSaveMode);
      const markdown = isMarkdownMode(mode);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Webpage" });
      const session = openSession({ kind: "website", url: submitUrl, folder, format: saveModeLabel(mode) }, false);
      const { signal, done } = startAbortable(toast, session);
      session.working();
      try {
        const saved: MarkdownSaveResult | { filePath: string; archive?: undefined; images?: undefined } = markdown
          ? await savePageAsMarkdown(submitUrl, folder, {
              signal,
              localImages: Boolean(values.localImages ?? prefs.markdownImages),
            })
          : await runMonolithSave(getMonolithPath(), {
              url: submitUrl,
              outputPath: reserveWebpagePath(folder, submitUrl),
              noJavaScript: mode === "lightweight",
              idleMs: getIdleTimeoutMs(),
              abortSignal: signal,
            });
        const { filePath } = saved;
        toast.style = Toast.Style.Success;
        toast.title = "Webpage Saved";
        // A page the site wouldn't show was read from the Internet Archive: say so.
        toast.message = [path.basename(filePath), imagesNote(saved.images), archiveNote(saved.archive)]
          .filter(Boolean)
          .join(" · ");
        toast.primaryAction = { title: "Open Folder", onAction: () => showInFinder(filePath) };
        // A note saved into an Obsidian vault opens there.
        const inObsidian = markdown ? obsidianUrl(filePath) : undefined;
        toast.secondaryAction = inObsidian
          ? { title: "Open in Obsidian", onAction: () => open(inObsidian) }
          : { title: "Open File", onAction: () => open(filePath) };
        succeedSession(session, toast, filePath);
      } catch (error) {
        // The Markdown mode runs no tool, so there's none to suggest updating.
        if (failToast(toast, error) && !markdown) await hintOutdatedTool(toast, "monolith");
        failSession(session, toast, error);
      } finally {
        done();
      }
      return;
    }

    if (ft === "transcript") {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Extracting Transcript" });
      const session = openSession({ kind: "transcript", url: submitUrl, folder, format: "Plain text" }, true);
      const { signal, done } = startAbortable(toast, session);
      session.working();
      try {
        // The same logins the details probe used, so a members-only video that offered Transcript can give it.
        const { transcript, title } = await extractTranscript(
          submitUrl,
          "en",
          signal,
          getVideoExtras().cookiesFromBrowser,
        );
        const filePath = uniqueFilePath(folder, title, "txt");
        // Defense in depth: sanitizeVideoTitle already strips separators, but
        // assert the resolved path stays inside the chosen folder before writing
        // so a pathological title can never escape it.
        if (path.relative(folder, filePath).startsWith("..")) {
          throw new Error("Refusing to write the transcript outside the chosen folder.");
        }
        fs.writeFileSync(filePath, transcript, "utf-8");
        toast.style = Toast.Style.Success;
        toast.title = "Transcript Saved";
        toast.message = path.basename(filePath);
        toast.primaryAction = { title: "Open", onAction: () => open(filePath) };
        toast.secondaryAction = { title: "Copy Transcript", onAction: () => Clipboard.copy(transcript) };
        succeedSession(session, toast, filePath);
      } catch (error) {
        if (failToast(toast, error)) await hintOutdatedTool(toast, "yt-dlp");
        failSession(session, toast, error);
      } finally {
        done();
      }
      return;
    }

    if (ft === "image" && src === "gallery") {
      const browser = resolveBrowser(prefs.cookiesFromBrowser, prefs.cookiesFromBrowserCustom);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading Gallery", message: "0 files" });

      if (browser.warning) {
        toast.style = Toast.Style.Failure;
        toast.title = "Cookies from Browser";
        toast.message = browser.warning;
        toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
        return;
      }

      const session = openSession({ kind: "gallery", url: submitUrl, folder }, false);
      const { signal, done } = startAbortable(toast, session);
      try {
        const { files } = await runGalleryDownload(
          getGalleryDlPath(),
          {
            url: submitUrl,
            destination: folder,
            cookiesFromBrowser: browser.spec || undefined,
            idleMs: getIdleTimeoutMs(),
            abortSignal: signal,
          },
          (p) => {
            toast.message = `${p.files} files`;
            session.count(p.files);
          },
        );
        if (files === 0) {
          // Exit 0 with nothing new is not a real "success" — surface it
          // honestly instead of a green "0 files" toast.
          toast.style = Toast.Style.Failure;
          toast.title = "Nothing downloaded";
          toast.message = "gallery-dl found no new files — they may already exist, or the gallery needs a login.";
          toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
          toast.secondaryAction = undefined;
          failSession(session, toast);
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Gallery Downloaded";
          toast.message = `${files} files`;
          toast.primaryAction = { title: "Open Folder", onAction: () => open(folder) };
          toast.secondaryAction = undefined;
          succeedSession(session, toast);
        }
      } catch (error) {
        if (isLoginRequiredError(error)) {
          toast.style = Toast.Style.Failure;
          toast.title = "Login Required";
          toast.message = browser.label
            ? `Sign in to the site in ${browser.label}, or change the browser in preferences.`
            : "Set Cookies from Browser in preferences to use your browser's session.";
          toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
          toast.secondaryAction = undefined;
        } else {
          if (failToast(toast, error)) await hintOutdatedTool(toast, "gallery-dl");
        }
        failSession(session, toast, error);
      } finally {
        done();
      }
      return;
    }

    if (ft === "image") {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading Thumbnail" });
      const session = openSession({ kind: "thumbnail", url: submitUrl, folder }, true);
      const { signal, done } = startAbortable(toast, session);
      session.working();
      try {
        const denoPath = getDenoPath();
        const extras = getVideoExtras();
        const { filePath } = await runThumbnailDownload(getytdlPath(), {
          url: submitUrl,
          outputTemplate: outputTemplateIn(folder),
          cookiesFromBrowser: extras.cookiesFromBrowser,
          forceIpv4: extras.forceIpv4,
          denoPath: fs.existsSync(denoPath) ? denoPath : undefined,
          idleMs: getIdleTimeoutMs(),
          abortSignal: signal,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Thumbnail Saved";
        toast.message = filePath ? path.basename(filePath) : undefined;
        toast.primaryAction = {
          title: "Open Folder",
          onAction: () => (filePath ? showInFinder(filePath) : open(folder)),
        };
        if (filePath) {
          toast.secondaryAction = { title: "Open File", onAction: () => open(filePath) };
        } else {
          toast.secondaryAction = undefined;
        }
        succeedSession(session, toast, filePath);
      } catch (error) {
        if (failToast(toast, error)) await hintOutdatedTool(toast, "yt-dlp");
        failSession(session, toast, error);
      } finally {
        done();
      }
      return;
    }

    if (ft === "audio" && src === "spotify") {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Downloading from Spotify",
        message: "0 tracks",
      });

      // Read credentials fresh on submit so prefs edited while the form is open
      // are picked up without re-launching the command.
      const livePrefs = getPreferenceValues<ExtensionPreferences>();
      const clientId = livePrefs.spotifyClientId?.trim();
      const clientSecret = livePrefs.spotifyClientSecret?.trim();
      const userAuth = livePrefs.spotifyUserAuth;
      if (!clientId || !clientSecret) {
        toast.style = Toast.Style.Failure;
        toast.title = "Spotify credentials missing";
        toast.message =
          "Open extension preferences and set Spotify: Client ID and Client Secret. The setup guide explains how to get them.";
        toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
        toast.secondaryAction = {
          title: "Open Setup Guide",
          onAction: () => open(SPOTDL_SETUP_GUIDE_URL),
        };
        return;
      }

      const spotifyFormat = String(values.audioFmt ?? livePrefs.spotifyAudioFormat);
      const session = openSession(
        { kind: "spotify", url: submitUrl, folder, format: formatTitle(spotifyFormat) },
        false,
      );
      const { signal, done } = startAbortable(toast, session);
      try {
        // An Intel-only spotDL (the prebuilt download) on an Apple Silicon Mac
        // without Rosetta would otherwise fail with a cryptic "Bad CPU type".
        // Surface the friendly hint instead.
        if (needsRosetta(getSpotdlPath())) throw new RosettaRequiredError();
        const { tracks } = await runSpotdlDownload(
          getSpotdlPath(),
          {
            url: submitUrl,
            destination: folder,
            // Honor the live audioFmt dropdown (the only place FLAC is offered);
            // fall back to the freshly-read preference. Previously this used the
            // stale module-level pref and silently ignored the dropdown.
            format: spotifyFormat,
            ffmpegPath: getffmpegPath(),
            clientId,
            clientSecret,
            userAuth,
            supportDir: environment.supportPath,
            idleMs: getIdleTimeoutMs(),
            abortSignal: signal,
          },
          (p) => {
            toast.message = `${p.tracks} tracks`;
            session.count(p.tracks);
          },
        );
        if (tracks === 0) {
          // A private or empty playlist can exit cleanly with nothing saved —
          // say so instead of a green "0 tracks".
          toast.style = Toast.Style.Failure;
          toast.title = "Nothing downloaded";
          toast.message =
            "spotDL saved no tracks. The playlist may be private or empty; for private playlists, turn on Spotify: User Authentication.";
          toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
          toast.secondaryAction = undefined;
          failSession(session, toast);
          return;
        }
        toast.style = Toast.Style.Success;
        toast.title = "Download Complete";
        toast.message = `${tracks} tracks`;
        toast.primaryAction = { title: "Open Folder", onAction: () => open(folder) };
        toast.secondaryAction = undefined;
        succeedSession(session, toast);
      } catch (error) {
        if (failToast(toast, error)) await hintOutdatedTool(toast, "spotdl");
        failSession(session, toast, error);
      } finally {
        done();
      }
      return;
    }

    // video, or audio on a non-Spotify site → yt-dlp.
    const format =
      ft === "audio"
        ? composeVideoFormat({
            mediaType: "audio",
            quality: "best",
            container: "mp4",
            audioFormat: String(values.audioFmt ?? prefs.audioFormat),
          })
        : values.exactFormat && values.exactFormat !== "auto"
          ? String(values.exactFormat)
          : composeVideoFormat({
              mediaType: "video",
              quality: String(values.quality ?? prefs.videoQuality),
              container: String(values.container ?? prefs.videoContainer),
              audioFormat: prefs.audioFormat,
            });
    const denoPath = getDenoPath();
    const extras = getVideoExtras();
    if (extras.cookieWarning) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cookies from Browser",
        message: extras.cookieWarning,
        primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
      });
      return;
    }
    // The picked videos of a playlist (none picked: all of them), a clip, a caption track.
    const picked = ((values.playlistItems as string[] | undefined) ?? []).map(Number).filter(Number.isInteger);
    const list = asPlaylist ? { items: picked } : undefined;
    const cut = list ? undefined : clip;
    // A soundtrack other than the original, from the ones this link offered.
    const dub = list ? undefined : soundtracks.find((s) => s.code === values.audioLanguage && !s.original);
    // An exact format with picture and sound in one file carries its own
    // soundtrack: saying "German" on a file that isn't would be worse than refusing.
    if (dub && !takesAudioLanguage(format.split("#")[0])) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Audio Language",
        message: `This exact format has its own soundtrack, so it can't be ${dub.title}. Set Exact Format to Auto, or pick a format without sound.`,
      });
      return;
    }
    const suffix = `${cut ? clipSuffix(cut) : ""}${dub ? languageSuffix(dub) : ""}`;
    const wanted = ft === "video" && !list && !cut ? parseSubtitleValue(values.subtitles) : undefined;
    // Only a track this link offered: the dropdown's value could be an earlier link's.
    const subtitles =
      wanted && tracks.some((t) => t.code === wanted.code && t.automatic === wanted.automatic) ? wanted : undefined;
    const noun = ft === "audio" ? "file" : "video";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: list ? "Downloading Playlist" : ft === "audio" ? "Downloading Audio" : "Downloading Video",
      message: "0%",
    });
    const exact = ft === "video" && !list && values.exactFormat && values.exactFormat !== "auto";
    const formatLabel = [
      ft === "audio"
        ? formatTitle(String(values.audioFmt ?? prefs.audioFormat))
        : exact
          ? `Format ${String(values.exactFormat).split("#")[0]}`
          : `${QUALITY_TITLE[String(values.quality ?? prefs.videoQuality)] ?? "Best"} · ${formatTitle(String(values.container ?? prefs.videoContainer))}`,
      cut ? `Clip ${clipLabel(cut)}` : undefined,
      dub ? `Audio: ${dub.title}` : undefined,
      subtitles ? "Subtitles" : undefined,
      list ? (picked.length > 0 ? `${plural(picked.length, noun)} picked` : "Whole playlist") : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    const session = openSession(
      { kind: ft === "audio" ? "audio" : "video", url: submitUrl, folder, format: formatLabel },
      true,
      list ? listTitle : undefined,
    );
    const { signal, done } = startAbortable(toast, session);
    try {
      const { filePath, files, total, failure } = await runVideoDownload(
        getytdlPath(),
        {
          url: submitUrl,
          format,
          outputTemplate: list
            ? playlistTemplateIn(folder)
            : suffix
              ? suffixedTemplateIn(folder, suffix)
              : outputTemplateIn(folder),
          clip: cut,
          audioLanguage: dub?.code,
          subtitles,
          playlist: list,
          ffmpegPath: getffmpegPath(),
          denoPath: fs.existsSync(denoPath) ? denoPath : undefined,
          idleMs: getIdleTimeoutMs(),
          abortSignal: signal,
          cookiesFromBrowser: extras.cookiesFromBrowser,
          embedMetadata: extras.embedMetadata,
          removeSponsors: extras.removeSponsors,
          forceIpv4: extras.forceIpv4,
        },
        () => undefined,
        (event) => {
          session.ytdlp(event);
          if (event.type === "progress") toast.message = progressMessage(session.getSnapshot()) || toast.message;
        },
      );
      if (list && files.length === 0) {
        // Exit 0 with nothing saved (every video filtered out) is no success.
        toast.style = Toast.Style.Failure;
        toast.title = "Nothing downloaded";
        toast.message = "yt-dlp found no videos to download in this playlist.";
        toast.primaryAction = undefined;
        toast.secondaryAction = undefined;
        failSession(session, toast);
        return;
      }
      if (list && (files.length > 1 || failure)) {
        // The playlist's own folder, which yt-dlp named; a link with several lists
        // (a channel's tabs) has one for each, inside the chosen folder.
        const folders = new Set(files.map((file) => path.dirname(file)));
        const listFolder = folders.size === 1 ? path.dirname(files[0]) : folder;
        toast.style = Toast.Style.Success;
        toast.title = "Playlist Downloaded";
        // Some videos of a playlist are often private or gone: say how many were saved, and why not all.
        toast.message = failure
          ? `${files.length}${total ? ` of ${total}` : ""} ${noun}s saved. ${errorSummary(failure, 200)}`
          : plural(files.length, noun);
        toast.primaryAction = { title: "Open Folder", onAction: () => open(listFolder) };
        toast.secondaryAction = failure ? { title: "Copy Error", onAction: () => Clipboard.copy(failure) } : undefined;
        succeedSession(session, toast, undefined, { items: files.length, folder: listFolder });
        return;
      }
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded";
      toast.message = filePath ? path.basename(filePath) : undefined;
      toast.primaryAction = {
        title: "Open Folder",
        onAction: () => (filePath ? showInFinder(filePath) : open(folder)),
      };
      if (filePath) {
        toast.secondaryAction = {
          title: "Copy to Clipboard",
          onAction: () => {
            Clipboard.copy({ file: filePath });
            showHUD("Copied to Clipboard");
          },
        };
      } else {
        toast.secondaryAction = undefined;
      }
      succeedSession(session, toast, filePath);
    } catch (error) {
      if (failToast(toast, error)) await hintOutdatedTool(toast, "yt-dlp");
      failSession(session, toast, error);
    } finally {
      done();
    }
  }

  return (
    <Form
      isLoading={metaLoading || (playlistLink && listLoading)}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} title="Download" onSubmit={handleSubmit} />
          <ActionPanel.Section>
            {metaReady && video && (
              <Action.Push
                icon={Icon.Eye}
                title="Preview Media"
                shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                target={<MediaPreview video={video} url={normalizeUrl(url)} />}
              />
            )}
            {validUrl && filetype === "website" && (
              <Action
                icon={Icon.Clipboard}
                title="Copy Page as Markdown"
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={() => copyPageAsMarkdown(normalizeUrl(url))}
              />
            )}
            {validUrl && source !== "spotify" && <ChatAboutLinkAction url={normalizeUrl(url)} />}
            <Action.Push
              icon={Icon.Clock}
              title="Show Download History"
              shortcut={HISTORY_SHORTCUT}
              target={<DownloadHistory />}
            />
            {validUrl && (
              <Action.OpenInBrowser
                title="Open URL in Browser"
                url={normalizeUrl(url)}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            )}
            <Action icon={Icon.Folder} title="Open Download Folder" onAction={() => open(downloadPath)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Hammer}
              title="Update Libraries"
              // A shortcut, since this last section sits below the fold of the action panel.
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "u" },
                Windows: { modifiers: ["ctrl", "shift"], key: "u" },
              }}
              target={<Updater />}
            />
            <Action.Push icon={Icon.Heartbeat} title="Check Tools" target={<Doctor />} />
            <Action.OpenInBrowser icon={Icon.Info} title="About This Extension" url={ABOUT_URL} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      searchBarAccessory={<Form.LinkAccessory text="Supported Sites" target={SUPPORTED_SITES_URL} />}
    >
      <Form.Description title={statusLabel} text={statusText} />
      {detailsText && <Form.Description title="Details" text={detailsText} />}
      <Form.TextField
        id="url"
        title="URL"
        autoFocus
        value={url}
        error={urlError}
        // Trimmed, so a pasted link's trailing space or newline doesn't make it invalid.
        onChange={(value) => {
          const next = value.trim();
          // A clip belongs to the video it was typed for.
          if (next !== url) setClipText("");
          setUrl(next);
        }}
        placeholder="https://www.youtube.com/watch?v=ykaj0pS4A1A"
      />
      {validUrl && (
        <>
          <Form.Dropdown
            id="filetype"
            title="Filetype"
            value={filetype}
            info={filetypeInfo}
            onChange={(next) => {
              // Only a real pick counts: if Raycast reports the type shown for a new
              // link (Image for Pinterest), the user's own choice must stay, so
              // pasting a video link again brings their Audio back.
              if (next === filetype) return;
              setFiletype(next as Filetype);
              setFiletypeTouched(true);
            }}
          >
            {filetypeOptions.map((ft) => (
              <Form.Dropdown.Item key={ft} value={ft} title={FILETYPE_TITLE[ft]} icon={FILETYPE_ICON[ft]} />
            ))}
          </Form.Dropdown>

          {filetype === "video" && (
            <>
              <Form.Dropdown
                id="quality"
                title="Quality"
                defaultValue={prefs.videoQuality}
                info={
                  estimates
                    ? "Resolution and size of what each choice downloads, estimated from the formats the site lists."
                    : undefined
                }
              >
                {QUALITY_VALUES.map((q) => (
                  <Form.Dropdown.Item
                    key={q}
                    value={q}
                    title={qualityTitle(q, estimates?.[q])}
                    icon={q === "best" ? Icon.Star : q === "smallest" ? Icon.ArrowDown : Icon.Monitor}
                  />
                ))}
              </Form.Dropdown>
              <Form.Dropdown
                id="container"
                title="Container"
                value={container}
                onChange={setContainer}
                info="MP4 prefers H.264 so the file opens in QuickTime and most players (up to 1080p on YouTube). MKV and WebM take the best streams of any codec."
              >
                <Form.Dropdown.Item value="mp4" title="MP4" />
                <Form.Dropdown.Item value="mkv" title="MKV" />
                <Form.Dropdown.Item value="webm" title="WebM" />
              </Form.Dropdown>
              {prefs.exactFormatSelection && !asPlaylist && (
                <Form.Dropdown id="exactFormat" title="Exact Format" defaultValue="auto">
                  <Form.Dropdown.Item value="auto" title="Auto — use Quality + Container above" />
                  {video &&
                    getVideoFormats(video).map((f) => (
                      <Form.Dropdown.Item key={f.format_id} value={getFormatValue(f)} title={getFormatTitle(f)} />
                    ))}
                </Form.Dropdown>
              )}
              {/* Not with a clip: the captions would keep the whole video's timing. */}
              {tracks.length > 0 && !asPlaylist && !clip && (
                <Form.Dropdown
                  id="subtitles"
                  // A new link starts at None: its tracks are its own.
                  key={`subtitles-${url}`}
                  title="Subtitles"
                  defaultValue="none"
                  info="Captions this video has. In the Video puts them inside the file, to switch on in the player. As a File saves an .srt next to it."
                >
                  <Form.Dropdown.Item value="none" title="None" />
                  <Form.Dropdown.Section title="In the Video">
                    {tracks.map((track) => (
                      <Form.Dropdown.Item
                        key={subtitleValue(track, true)}
                        value={subtitleValue(track, true)}
                        title={track.title}
                        icon={Icon.SpeechBubble}
                      />
                    ))}
                  </Form.Dropdown.Section>
                  <Form.Dropdown.Section title="As a File (.srt)">
                    {tracks.map((track) => (
                      <Form.Dropdown.Item
                        key={subtitleValue(track, false)}
                        value={subtitleValue(track, false)}
                        title={track.title}
                        icon={Icon.Document}
                      />
                    ))}
                  </Form.Dropdown.Section>
                </Form.Dropdown>
              )}
            </>
          )}

          {filetype === "audio" && (
            <Form.Dropdown
              id="audioFmt"
              key={`audioFmt-${source}`}
              title="Format"
              defaultValue={source === "spotify" ? prefs.spotifyAudioFormat : prefs.audioFormat}
              info={
                source === "spotify"
                  ? undefined
                  : "MP3 plays everywhere but is re-encoded. M4A and Opus keep the site's original audio when it already comes in that format. FLAC and WAV are for editing: bigger files, never better sound than the site's own audio."
              }
            >
              <Form.Dropdown.Item value="mp3" title="MP3" />
              <Form.Dropdown.Item value="m4a" title="M4A" />
              <Form.Dropdown.Item value="opus" title="Opus" />
              <Form.Dropdown.Item value="flac" title="FLAC" />
              {source !== "spotify" && <Form.Dropdown.Item value="wav" title="WAV" />}
            </Form.Dropdown>
          )}

          {mediaFiletype && !asPlaylist && soundtracks.length > 1 && (
            <Form.Dropdown
              id="audioLanguage"
              // A new link starts at its own original soundtrack.
              key={`audioLanguage-${url}`}
              title="Audio Language"
              defaultValue={soundtracks[0].code}
              info="This video has more than one soundtrack. A dubbed one is saved under its own file name."
            >
              {soundtracks.map((s) => (
                <Form.Dropdown.Item
                  key={s.code}
                  value={s.code}
                  title={s.original ? `${s.title} (original)` : s.title}
                />
              ))}
            </Form.Dropdown>
          )}

          {mediaFiletype && !asPlaylist && (
            <Form.TextField
              id="clip"
              title="Clip"
              value={clipText}
              onChange={setClipText}
              error={clipError}
              placeholder="Whole video — or 1:30-2:45"
              info="Download only part of it: start-end, such as 1:30-2:45, 90-120 (seconds) or 1:30- (to the end). The cut is exact, so a long clip takes a while to encode, and subtitles and SponsorBlock are left out of it. Leave empty for the whole video."
            />
          )}

          {asPlaylist && listReady && playlist && playlist.entries.length > 0 && (
            <Form.TagPicker
              id="playlistItems"
              // A new link starts with nothing picked.
              key={`playlist-${url}`}
              title="Videos"
              placeholder={`All ${playlist.truncated ? "" : `${playlist.entries.length} `}videos`}
              info={`Leave empty to download the whole playlist, or pick the videos you want.${playlist.truncated ? ` Only the first ${PLAYLIST_PICK_LIMIT} are listed.` : ""}`}
            >
              {playlist.entries.map((entry) => (
                <Form.TagPicker.Item
                  key={entry.index}
                  value={String(entry.index)}
                  title={`${entry.index}. ${entry.title}${entry.duration ? ` (${formatClock(entry.duration)})` : ""}`}
                />
              ))}
            </Form.TagPicker>
          )}
          {asPlaylist && listReady && playlist?.lists && (
            <Form.Description
              title="Videos"
              text={`This link holds ${playlist.lists.length} lists (${playlist.lists.slice(0, 4).join(", ")}${playlist.lists.length > 4 ? "…" : ""}), and all of them will be downloaded. To pick single videos, paste one list's own link — a channel's Videos tab, say.`}
            />
          )}
          {asPlaylist && listReady && !playlist && (
            <Form.Description
              title="Videos"
              text="Couldn't list this playlist's videos, so all of them will be downloaded."
            />
          )}

          {filetype === "website" && (
            <Form.Dropdown
              id="saveMode"
              title="Save Mode"
              value={saveMode}
              onChange={setSaveMode}
              info="Complete and Lightweight keep the page as one .html file. Markdown keeps the article's text, links and images as a .md file — for notes apps such as Obsidian."
            >
              <Form.Dropdown.Item value="complete" title="Complete (embed everything)" />
              <Form.Dropdown.Item value="lightweight" title="Lightweight (no JavaScript)" />
              <Form.Dropdown.Item value="markdown" title="Markdown (article text)" />
            </Form.Dropdown>
          )}
          {filetype === "website" && isMarkdownMode(saveMode) && (
            <Form.Checkbox
              id="localImages"
              title="Images"
              label="Save images next to the file"
              defaultValue={prefs.markdownImages}
              info="Downloads the article's images into an assets folder beside the .md file, so the note works offline. Off: images stay links to the web."
            />
          )}

          <Form.FilePicker
            id="destination"
            // Markdown notes have a folder of their own (Webpage: Markdown Folder), when one is set.
            key={toMarkdownFolder ? "destination-markdown" : "destination"}
            title="Folder"
            allowMultipleSelection={false}
            canChooseDirectories
            canChooseFiles={false}
            defaultValue={[toMarkdownFolder ? markdownPath : downloadPath]}
          />
        </>
      )}
    </Form>
  );
}
