import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  Action,
  ActionPanel,
  BrowserExtension,
  Clipboard,
  Form,
  Icon,
  Keyboard,
  getPreferenceValues,
  getSelectedText,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useForm, usePromise } from "@raycast/utils";
import { execa } from "execa";
import { logger } from "@chrismessina/raycast-logger";
import {
  DownloadOptions,
  getffmpegPath,
  getffprobePath,
  formatLanguage,
  getAudioLanguages,
  getLanguageFormatSelector,
  getFormats,
  getFormatTitles,
  getFormatValue,
  getytdlPath,
  getYtdlpEnv,
  getCommonArgs,
  copyToClipboardAction,
  describeYtdlpError,
  looksLikeFilePath,
  hasPlaylist,
  isLiveStream,
  isMac,
  isNoisyWarning,
  isValidHHMM,
  isValidUrl,
  normalizeVideoUrl,
  parseHHMM,
  sanitizeVideoTitle,
} from "./utils.js";
import { Video } from "./types.js";
import { MP3_FORMAT_ID } from "./utils.js";
import Installer from "./views/installer.js";
import Updater from "./views/updater.js";

const {
  downloadPath,
  autoLoadUrlFromClipboard,
  autoLoadUrlFromSelectedText,
  enableBrowserExtensionSupport,
  fastRemux = true,
} = getPreferenceValues<ExtensionPreferences>();

const log = logger.child("[yt-dlp]");

const REAL_DOWNLOAD_MARKER = "real-download: ";

// One line per format yt-dlp returned, with the fields the dropdown hides, so a
// confusing dropdown can be traced back to the raw data.
function logFormats(video: Video) {
  const rows = video.formats.map((f) =>
    [f.format_id, f.resolution, f.fps, f.ext, f.vcodec, f.acodec, f.tbr, f.protocol, f.language, f.format_note]
      .map((value) => value ?? "-")
      .join(" | "),
  );
  log.debug(
    `${video.formats.length} formats (id | resolution | fps | ext | vcodec | acodec | tbr | protocol | language | note)\n${rows.join("\n")}`,
  );
}

export default function DownloadVideo() {
  const { push } = useNavigation();
  const [error, setError] = useState(0);
  const [warning, setWarning] = useState("");

  const ytdlPath = useMemo(() => getytdlPath(), [error]);
  const ffmpegPath = useMemo(() => getffmpegPath(), [error]);
  const ffprobePath = useMemo(() => getffprobePath(), [error]);

  const { handleSubmit, values, itemProps, setValue, setValidationError } = useForm<DownloadOptions>({
    initialValues: {
      url: "",
    },
    onSubmit: async (values) => {
      if (!values.format) return;
      // While a new URL loads, the previous video's formats are still on screen,
      // and their IDs (and dubbed tracks) mean something else in the new video.
      if (isLoading || video?.sourceUrl !== values.url) {
        setValidationError("url", "Formats for this URL are still loading");
        return;
      }
      setValidationError("url", undefined);
      // A dubbed download gets its own file name; otherwise yt-dlp would find the
      // original-language file already on disk and skip the download.
      const dubSuffix = dubLanguage ? ` [${formatLanguage(dubLanguage)}]` : "";
      const options = ["-o", path.join(downloadPath, `${video?.title || "video"} (%(id)s)${dubSuffix}.%(ext)s`)];
      const [downloadFormat, recodeFormat] = values.format.split("#");

      // `medium` ("Audio"/"Video") is derived at component scope from the selected
      // format and reused here for the progress toasts below.

      // The metadata preview is always for the single video, so default to
      // --no-playlist; only pull the whole list when the user opted in via the
      // "Download entire playlist" checkbox (shown only for playlist URLs).
      options.push(values.downloadPlaylist ? "--yes-playlist" : "--no-playlist");

      options.push("--ffmpeg-location", ffmpegPath);

      if (values.format === MP3_FORMAT_ID) {
        if (languageSelector) options.push("--format", languageSelector);
        options.push("--extract-audio");
        options.push("--audio-format", "mp3");
        options.push("--audio-quality", "0");
      } else {
        options.push("--format", languageSelector ?? downloadFormat);
        const hasWebmAudio = video?.formats.some((f) => f.acodec?.includes("opus") || f.acodec?.includes("vorbis"));
        const canRemux = fastRemux && (recodeFormat !== "webm" || hasWebmAudio);
        options.push(canRemux ? "--remux-video" : "--recode-video", recodeFormat);
      }

      const toast = await showToast({
        title: `Downloading ${medium}`,
        style: Toast.Style.Animated,
        message: "0%",
      });

      options.push("--progress");
      options.push("--print", "after_move:filepath");
      // yt-dlp silently skips a file that's already on disk (and exits 0), so ask
      // it whether this run actually downloaded anything.
      options.push("--print", `post_process:${REAL_DOWNLOAD_MARKER}%(__real_download)s`);

      const downloadArgs = [...getCommonArgs(), ...options, normalizeVideoUrl(values.url)];
      log.log("Download started", { args: downloadArgs });
      const downloadProcess = spawn(ytdlPath, downloadArgs, { env: getYtdlpEnv(ytdlPath) });

      let canceled = false;
      toast.primaryAction = {
        title: "Cancel Download",
        shortcut: { macOS: { modifiers: ["cmd"], key: "." }, Windows: { modifiers: ["ctrl"], key: "." } },
        onAction: () => {
          canceled = true;
          // SIGINT lets yt-dlp stop cleanly; its partial file resumes next time.
          downloadProcess.kill("SIGINT");
        },
      };

      let filePath = "";
      let realDownloads = 0;
      let skippedDownloads = 0;
      // stdout chunks can end mid-line, so markers and paths are read from
      // complete lines only (progress updates are matched per chunk below).
      let pendingStdout = "";
      const consumeStdoutLine = (line: string) => {
        const trimmed = line.trim();
        if (trimmed === `${REAL_DOWNLOAD_MARKER}True`) realDownloads++;
        else if (trimmed === `${REAL_DOWNLOAD_MARKER}False`) skippedDownloads++;
        else if (looksLikeFilePath(trimmed)) filePath = trimmed;
      };
      // Accumulate the full stderr stream so a failure can surface complete logs
      // via "Copy Logs". `lastErrorLine` is the most useful single line to show
      // in the toast body when the download fails.
      const logLines: string[] = [];
      let lastErrorLine = "";
      // stderr emits chunks, which can hold several lines or end mid-line.
      // Classify only complete lines so a noisy warning cannot hide another
      // warning or error that arrived in the same chunk.
      let pendingStderr = "";

      const consumeStderrLine = (line: string) => {
        if (!line) return;
        log.log(line);

        // Surface warnings inline, and remember the last error line for the
        // failure toast — but do NOT touch toast.message here: the running toast
        // is reserved for download progress (stderr would otherwise clobber it
        // on every chunk). The exit code in `close` is the real failure verdict.
        if (line.startsWith("WARNING:") && !isNoisyWarning(line)) {
          setWarning(line);
        }
        if (line.startsWith("ERROR:")) {
          lastErrorLine = line.trim();
        }
      };

      downloadProcess.stdout.on("data", (data) => {
        const text = data.toString() as string;

        if (/\[(Merger|VideoConvertor|Remux|ExtractAudio|Fixup)/i.test(text)) {
          toast.title = `Packaging ${medium}`;
          toast.message = "Finalizing...";
        }

        const progressMatch = /\[download\]\s+(\d+(\.\d+)?)%.*/.exec(text);
        if (progressMatch) {
          toast.title = `Downloading ${medium}`;
          toast.message = `${Math.floor(Number(progressMatch[1]))}%`;
        }

        const lines = (pendingStdout + text).split(/\r?\n|\r/);
        pendingStdout = lines.pop() ?? "";
        for (const line of lines) consumeStdoutLine(line);
      });

      downloadProcess.stderr.on("data", (data) => {
        const chunk = data.toString();
        logLines.push(chunk);

        const parts = (pendingStderr + chunk).split(/\r?\n/);
        pendingStderr = parts.pop() ?? "";
        for (const line of parts) consumeStderrLine(line);
      });

      downloadProcess.on("close", (code) => {
        if (pendingStderr) {
          consumeStderrLine(pendingStderr);
          pendingStderr = "";
        }
        if (pendingStdout) {
          consumeStdoutLine(pendingStdout);
          pendingStdout = "";
        }
        log.log("Download finished", { exitCode: code, filePath, canceled, realDownloads, skippedDownloads });

        if (canceled) {
          toast.style = Toast.Style.Failure;
          toast.title = "Download Canceled";
          toast.message = video?.title;
          toast.primaryAction = undefined;
          return;
        }

        // The exit code is the sole success/failure verdict: 0 is success,
        // anything else (including null, i.e. killed by a signal) is a failure.
        if (code !== 0) {
          const reason = code === null ? "yt-dlp was terminated" : `yt-dlp exited with code ${code}`;
          toast.title = "Download Failed";
          toast.style = Toast.Style.Failure;
          toast.message = lastErrorLine || reason;

          const logs = logLines.join("").trim() || reason;
          toast.primaryAction = copyToClipboardAction("Copy Logs", logs, "Copied Logs to Clipboard");

          // If a file actually landed on disk before the non-zero exit (e.g. a
          // non-fatal postprocessor failure), still let the user open it.
          if (filePath) {
            toast.secondaryAction = {
              title: isMac ? "Open in Finder" : "Open in Explorer",
              shortcut: { modifiers: ["cmd", "shift"], key: "o" },
              onAction: () => {
                open(path.dirname(filePath));
              },
            };
          } else {
            // "Bad guest token" and similar extractor failures are often resolved
            // by a newer yt-dlp, so offer a one-key jump to the update view.
            toast.secondaryAction = {
              title: "Update Libraries",
              shortcut: { modifiers: ["cmd", "shift"], key: "u" },
              onAction: () => {
                push(<Updater />);
              },
            };
          }
          return;
        }

        const allSkipped = skippedDownloads > 0 && realDownloads === 0;
        toast.title = allSkipped ? `${medium} Already Downloaded` : `${medium} Downloaded`;
        toast.style = Toast.Style.Success;
        toast.message =
          skippedDownloads > 0 && realDownloads > 0
            ? `${realDownloads} downloaded, ${skippedDownloads} already in your download folder`
            : video?.title;
        toast.primaryAction = undefined;

        if (filePath) {
          toast.primaryAction = {
            title: isMac ? "Open in Finder" : "Open in Explorer",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: () => {
              open(path.dirname(filePath));
            },
          };
          toast.secondaryAction = {
            title: "Copy to Clipboard",
            shortcut: { modifiers: ["cmd", "shift"], key: "c" },
            onAction: () => {
              Clipboard.copy({ file: filePath });
              showHUD("Copied to Clipboard");
            },
          };
        }
      });
    },
    validation: {
      url: (value) => {
        if (!value) {
          return "URL is required";
        }
        if (!isValidUrl(value)) {
          return "Invalid URL";
        }
      },
      startTime: (value) => {
        if (value) {
          if (!isValidHHMM(value)) {
            return "Invalid time format";
          }
        }
      },
      endTime: (value) => {
        if (value) {
          if (!isValidHHMM(value)) {
            return "Invalid time format";
          }
          if (video && parseHHMM(value) > video?.duration) {
            return "End time is greater than video duration";
          }
        }
      },
    },
  });

  const {
    data: video,
    isLoading,
    error: videoError,
    revalidate,
  } = usePromise(
    async (url: string) => {
      if (!url) return;
      if (!isValidUrl(url)) return;

      const args = [
        ...getCommonArgs({ throttle: true }),
        "--no-playlist",
        "--dump-json",
        "--format-sort=res,ext,tbr",
        normalizeVideoUrl(url),
      ];
      log.log("Fetching video info", { ytdlPath, args });
      const result = await execa(ytdlPath, args, { env: getYtdlpEnv(ytdlPath) });
      if (result.stderr) log.log(result.stderr);
      const data = JSON.parse(result.stdout) as Video;
      logFormats(data);

      return { ...data, title: sanitizeVideoTitle(data.title), sourceUrl: url };
    },
    [values.url],
    {
      onError(error) {
        const friendly = describeYtdlpError(error);
        // "Try Again" is the primary action only when retrying could help
        // (transient/rate-limit failures); for an unsupported or unavailable
        // URL it would be misleading, so Copy Logs leads instead. Copy Logs
        // always copies the full raw error for debugging, not the summary.
        const copyLogs = copyToClipboardAction("Copy Logs", error.message, "Copied Logs to Clipboard");
        showToast({
          style: Toast.Style.Failure,
          title: friendly.title,
          message: friendly.message,
          primaryAction: friendly.retryable
            ? {
                title: "Try Again",
                shortcut: Keyboard.Shortcut.Common.Refresh,
                onAction: () => {
                  revalidate();
                },
              }
            : copyLogs,
          secondaryAction: friendly.retryable ? copyLogs : undefined,
        });
      },
    },
  );

  useEffect(() => {
    if (video) {
      if (isLiveStream(video)) {
        setValidationError("url", "Live streams are not supported");
      }
    }
  }, [video]);

  useEffect(() => {
    (async () => {
      if (autoLoadUrlFromClipboard) {
        const clipboardText = await Clipboard.readText();
        if (clipboardText && isValidUrl(clipboardText)) {
          setValue("url", clipboardText);
          return;
        }
      }

      if (autoLoadUrlFromSelectedText) {
        try {
          const selectedText = await getSelectedText();
          if (selectedText && isValidUrl(selectedText)) {
            setValue("url", selectedText);
            return;
          }
        } catch {
          // Suppress the error if Raycast didn't find any selected text
        }
      }

      if (enableBrowserExtensionSupport) {
        try {
          const tabUrl = (await BrowserExtension.getTabs()).find((tab) => tab.active)?.url;
          if (tabUrl && isValidUrl(tabUrl)) setValue("url", tabUrl);
        } catch {
          // Suppress the error if Raycast didn't find browser extension
        }
      }
    })();
  }, []);

  const missingExecutable = useMemo(() => {
    if (!fs.existsSync(ytdlPath)) {
      return "yt-dlp";
    }
    if (!fs.existsSync(ffmpegPath)) {
      return "ffmpeg";
    }
    if (!fs.existsSync(ffprobePath)) {
      return "ffprobe";
    }
    return null;
  }, [error]);

  const formats = useMemo(() => getFormats(video), [video]);

  // "Audio" when the selected format is audio-only (MP3 via --extract-audio, or a
  // raw audio stream like M4A/Opus — every "Audio Only" entry has vcodec "none"),
  // else "Video". Drives both the submit button label and the progress toasts, so
  // the whole flow agrees on what's being downloaded. MP3_FORMAT_ID is a hardcoded
  // value with no backing Format in the list, so it's checked explicitly.
  const selectedFormat = useMemo(
    () =>
      Object.values(formats)
        .flat()
        .find((format) => getFormatValue(format) === values.format),
    [formats, values.format],
  );
  const audioLanguages = useMemo(() => getAudioLanguages(video), [video]);
  // Only the languages the selected format can be downloaded in. A format with
  // its own fixed soundtrack offers none, so the dropdown hides rather than
  // naming a language the download would ignore. Track IDs are specific to one
  // video, so a playlist download keeps each video's default soundtrack.
  const languageOptions =
    audioLanguages && selectedFormat && video && !values.downloadPlaylist
      ? audioLanguages.options.filter(
          (option) =>
            option.code === audioLanguages.original || getLanguageFormatSelector(selectedFormat, video, option.code),
        )
      : [];
  // A choice belongs to the URL it was made for, so a new video starts on its
  // original language, as does a reload that no longer offers the choice.
  const [languageChoice, setLanguageChoice] = useState<{ url: string; code: string }>();
  const audioLanguage =
    languageChoice?.url === video?.sourceUrl && languageOptions.some((option) => option.code === languageChoice?.code)
      ? languageChoice?.code
      : audioLanguages?.original;
  // Applied for the original too, so the download never rests on yt-dlp's own
  // track ranking; only a dub changes the file name.
  const languageSelector =
    audioLanguages && audioLanguage && selectedFormat && video && !values.downloadPlaylist
      ? getLanguageFormatSelector(selectedFormat, video, audioLanguage)
      : undefined;
  const dubLanguage = languageSelector && audioLanguage !== audioLanguages?.original ? audioLanguage : undefined;

  const medium = values.format === MP3_FORMAT_ID || selectedFormat?.vcodec === "none" ? "Audio" : "Video";

  // Classify the load error once so the placeholder, the Title row, and the
  // Try Again action all agree on whether a retry would help.
  const friendlyError = videoError ? describeYtdlpError(videoError) : null;

  // Friendlier, state-aware placeholder for the Title row. Em dash means "no URL
  // queried yet". On a retryable error, nudge toward Try Again; otherwise show
  // the reason (e.g. "Unsupported Site") since retrying won't help.
  const titlePlaceholder =
    video?.title ??
    (friendlyError ? (friendlyError.retryable ? "Couldn't load — press ⌘R to try again" : friendlyError.title) : "—");

  if (missingExecutable) {
    return <Installer executable={missingExecutable} onRefresh={() => setError(error + 1)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              icon={Icon.Download}
              title={`Download ${medium}`}
              onSubmit={(values) => {
                setWarning("");
                handleSubmit({ ...values, copyToClipboard: false } as DownloadOptions);
              }}
            />
            {/* Only offer Try Again when revalidating could actually help: a
                retryable fetch error, or a valid URL that hasn't loaded yet.
                Invalid URLs (no-op re-query) and non-retryable errors like
                "Unsupported Site" are excluded. */}
            {((friendlyError?.retryable ?? false) ||
              (!video && !isLoading && !videoError && isValidUrl(values.url))) && (
              <Action
                icon={Icon.ArrowClockwise}
                title="Try Again"
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => revalidate()}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push icon={Icon.Hammer} title="Update Libraries" target={<Updater />} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      searchBarAccessory={
        <Form.LinkAccessory
          text="Supported Sites"
          target="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md"
        />
      }
    >
      <Form.Description title="Title" text={titlePlaceholder} />
      <Form.TextField
        {...itemProps.url}
        autoFocus
        title="URL"
        placeholder="https://www.youtube.com/watch?v=ykaj0pS4A1A"
      />
      {warning && <Form.Description text={warning} />}
      {video && (
        <Form.Dropdown {...itemProps.format} title="Format">
          {Object.entries(formats).map(([category, formats]) => {
            const titles = getFormatTitles(formats);
            return (
              <Form.Dropdown.Section title={category} key={category}>
                {formats.map((format, i) => (
                  <Form.Dropdown.Item key={format.format_id} value={getFormatValue(format)} title={titles[i]} />
                ))}
              </Form.Dropdown.Section>
            );
          })}
        </Form.Dropdown>
      )}
      {video && languageOptions.length > 1 && (
        <Form.Dropdown
          id="audioLanguage"
          title="Audio Language"
          value={audioLanguage}
          onChange={(code) => setLanguageChoice({ url: video.sourceUrl, code })}
        >
          {languageOptions.map((option) => (
            <Form.Dropdown.Item key={option.code} value={option.code} title={option.name} />
          ))}
        </Form.Dropdown>
      )}
      {hasPlaylist(values.url) && (
        <Form.Checkbox
          {...itemProps.downloadPlaylist}
          title="Playlist"
          label="Download entire playlist"
          info="This URL is part of a playlist. Leave unchecked to download only the video shown above."
        />
      )}
    </Form>
  );
}
