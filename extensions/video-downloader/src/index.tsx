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
import {
  DownloadOptions,
  getffmpegPath,
  getffprobePath,
  getFormats,
  getFormatTitle,
  getFormatValue,
  getytdlPath,
  getCommonArgs,
  copyToClipboardAction,
  describeYtdlpError,
  looksLikeFilePath,
  hasPlaylist,
  isMac,
  isValidHHMM,
  isValidUrl,
  parseHHMM,
  sanitizeVideoTitle,
} from "./utils.js";
import { Video } from "./types.js";
import { MP3_FORMAT_ID } from "./utils.js";
import Installer from "./views/installer.js";
import Updater from "./views/updater.js";

const { downloadPath, autoLoadUrlFromClipboard, autoLoadUrlFromSelectedText, enableBrowserExtensionSupport } =
  getPreferenceValues<ExtensionPreferences>();

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
      const options = ["-o", path.join(downloadPath, `${video?.title || "video"} (%(id)s).%(ext)s`)];
      const [downloadFormat, recodeFormat] = values.format.split("#");

      // The metadata preview is always for the single video, so default to
      // --no-playlist; only pull the whole list when the user opted in via the
      // "Download entire playlist" checkbox (shown only for playlist URLs).
      options.push(values.downloadPlaylist ? "--yes-playlist" : "--no-playlist");

      options.push("--ffmpeg-location", ffmpegPath);

      if (values.format === MP3_FORMAT_ID) {
        options.push("--extract-audio");
        options.push("--audio-format", "mp3");
        options.push("--audio-quality", "0");
      } else {
        options.push("--format", downloadFormat);
        options.push("--recode-video", recodeFormat);
      }

      const toast = await showToast({
        title: "Downloading Video",
        style: Toast.Style.Animated,
        message: "0%",
      });

      options.push("--progress");
      options.push("--print", "after_move:filepath");

      const downloadProcess = spawn(ytdlPath, [...getCommonArgs(), ...options, values.url], {
        env: { ...globalThis.process.env, PYTHONUNBUFFERED: "1" },
      });

      let filePath = "";
      // Accumulate the full stderr stream so a failure can surface complete logs
      // via "Copy Logs". `lastErrorLine` is the most useful single line to show
      // in the toast body when the download fails.
      const logLines: string[] = [];
      let lastErrorLine = "";

      downloadProcess.stdout.on("data", (data) => {
        const line = data.toString() as string;

        const progress = Number(/\[download\]\s+(\d+(\.\d+)?)%.*/.exec(line)?.[1]);
        if (progress) {
          const currentProgress = Number(toast.message?.replace("%", ""));

          if (progress < currentProgress) {
            toast.title = "Formatting Video";
          }
          toast.message = `${Math.floor(progress)}%`;
        }

        if (looksLikeFilePath(line)) {
          filePath = line.trim();
        }
      });

      downloadProcess.stderr.on("data", (data) => {
        const line = data.toString();
        logLines.push(line);

        // Surface warnings inline, and remember the last error line for the
        // failure toast — but do NOT touch toast.message here: the running toast
        // is reserved for download progress (stderr would otherwise clobber it
        // on every chunk). The exit code in `close` is the real failure verdict.
        if (line.startsWith("WARNING:")) {
          setWarning(line);
        }
        if (line.startsWith("ERROR:")) {
          lastErrorLine = line.trim();
        }
      });

      downloadProcess.on("close", (code) => {
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

        toast.title = "Video Downloaded";
        toast.style = Toast.Style.Success;
        toast.message = video?.title;

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

      const result = await execa(
        ytdlPath,
        [...getCommonArgs({ throttle: true }), "--no-playlist", "--dump-json", "--format-sort=res,ext,tbr", url],
        {
          env: {
            ...process.env,
            PYTHONUNBUFFERED: "1",
          },
        },
      );
      const data = JSON.parse(result.stdout) as Video;

      return { ...data, title: sanitizeVideoTitle(data.title) };
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
                shortcut: { modifiers: ["cmd"], key: "r" },
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
      if (video.live_status !== "not_live" && video.live_status !== undefined) {
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
              title="Download Video"
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
                shortcut={{ modifiers: ["cmd"], key: "r" }}
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
          {Object.entries(formats).map(([category, formats]) => (
            <Form.Dropdown.Section title={category} key={category}>
              {formats.map((format) => (
                <Form.Dropdown.Item
                  key={format.format_id}
                  value={getFormatValue(format)}
                  title={getFormatTitle(format)}
                />
              ))}
            </Form.Dropdown.Section>
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
