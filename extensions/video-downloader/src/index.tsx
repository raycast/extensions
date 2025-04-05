import { spawn } from "node:child_process";
import path from "node:path";
import {
  Action,
  ActionPanel,
  BrowserExtension,
  Clipboard,
  Form,
  Icon,
  Toast,
  getSelectedText,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useCachedState, useForm, usePromise } from "@raycast/utils";
import { execa } from "execa";
import {
  checkExecutables,
  getFormats,
  getFormatTitle,
  getFormatValue,
  isValidClipstamp,
  isValidUrl,
  preferences,
  secondsToTimestamp,
  timestampToSeconds,
} from "./utils.js";
import { DownloadOptions, Video } from "./types.js";
import Advanced from "./views/advanced.js";
import Installer from "./views/installer.js";
import Updater from "./views/updater.js";

const {
  downloadPath,
  ytdlPath,
  ffmpegPath,
  autoLoadUrlFromClipboard,
  autoLoadUrlFromSelectedText,
  enableBrowserExtensionSupport,
  forceIpv4,
} = preferences;

export default function DownloadVideo() {
  const [video, setVideo] = useState<Video>();
  const [error, setError] = useState(0);
  const [warning, setWarning] = useState("");
  const [showAdvanced, setShowAdvanced] = useCachedState("show-advanced", false);
  const [missingExecutables, setMissingExecutables] = useState<string[]>([]);

  const { handleSubmit, values, itemProps, setValue, setValidationError } = useForm<DownloadOptions>({
    initialValues: {
      url: "",
    },
    onSubmit: async (values) => {
      if (!values.format) return;
      const options = ["-P", downloadPath];
      const [downloadFormat, recodeFormat] = values.format.split("#");

      options.push("--ffmpeg-location", ffmpegPath);
      options.push("--format", downloadFormat);
      options.push("--recode-video", recodeFormat);

      if (showAdvanced && values.clip) {
        options.push("--download-sections", values.clip.trim());
      }

      const toast = await showToast({
        title: "Downloading Video",
        style: Toast.Style.Animated,
        message: "0%",
      });

      options.push("--progress");
      options.push("--print", "after_move:filepath");

      const process = spawn(ytdlPath, [...options, values.url]);

      let filePath = "";

      process.stdout.on("data", (data) => {
        const line = data.toString();
        console.log(line);

        const progress = Number(/\[download\]\s+(\d+(\.\d+)?)%.*/.exec(line)?.[1]);
        if (progress) {
          const currentProgress = Number(toast.message?.replace("%", ""));

          if (progress < currentProgress) {
            toast.title = "Formatting Video";
          }
          toast.message = `${Math.floor(progress)}%`;
        }

        if (line.startsWith("/")) {
          filePath = line;
        }
      });

      process.stderr.on("data", (data) => {
        const line = data.toString();
        console.error(line);

        if (line.startsWith("WARNING:")) {
          setWarning(line);
        }

        if (line.startsWith("ERROR:")) {
          toast.title = "Download Failed";
          toast.style = Toast.Style.Failure;
        }
        toast.message = line;
      });

      process.on("close", () => {
        if (toast.style === Toast.Style.Failure) {
          return;
        }

        toast.title = "Video Downloaded";
        toast.style = Toast.Style.Success;
        toast.message = video?.title;

        if (filePath) {
          toast.primaryAction = {
            title: "Open in Finder",
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
      clip: (value) => {
        const duration = video?.duration ?? 0;
        const errorMessage = `Invalid clip range, it should be between "${secondsToTimestamp(0)}-${secondsToTimestamp(duration)}"`;
        if (!isValidClipstamp(value)) {
          return errorMessage;
        }
        if (value) {
          const [from, to] = value.split("-");
          const secondsFrom = from ? timestampToSeconds(from) : 0;
          const secondsTo = to ? timestampToSeconds(to) : duration;
          if (secondsFrom > duration || secondsTo < secondsFrom || secondsTo > duration || secondsFrom === secondsTo) {
            return errorMessage;
          }
        }
      },
    },
  });

  const { isLoading } = usePromise(
    async (url: string) => {
      if (!url) return;
      if (!isValidUrl(url)) return;

      const result = await execa(
        ytdlPath,
        [forceIpv4 ? "--force-ipv4" : "", "--dump-json", "--format-sort=resolution,ext,tbr", url].filter((x) =>
          Boolean(x),
        ),
      );

      setVideo(JSON.parse(result.stdout) as Video);
    },
    [values.url],
    {
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Video not found with the provided URL",
          message: error.message,
          primaryAction: {
            title: "Copy to Clipboard",
            onAction: () => {
              Clipboard.copy(error.message);
            },
          },
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

  useEffect(() => {
    (async () => {
      const executables = await checkExecutables();
      const notInstalled = executables.filter(([, exists]) => !exists).map(([app]) => app);
      setMissingExecutables(notInstalled);
    })();
  }, [error]);

  const formats = useMemo(() => getFormats(video, showAdvanced), [showAdvanced, video]);

  if (missingExecutables.length > 0) {
    return <Installer missingExecutables={missingExecutables} onRefresh={() => setError(error + 1)} />;
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
      <Form.Description title="Title" text={video?.title ?? "Video not found"} />
      <Form.TextField
        {...itemProps.url}
        autoFocus
        title="URL"
        placeholder="https://www.youtube.com/watch?v=ykaj0pS4A1A"
      />
      {warning && <Form.Description text={warning} />}
      {video && (
        <>
          <Form.Dropdown {...itemProps.format} title="Format">
            {Object.entries(formats).map(([category, formats]) => (
              <Form.Dropdown.Section title={category} key={category}>
                {formats.map((format) => (
                  <Form.Dropdown.Item
                    key={format.format_id}
                    value={getFormatValue(format, category, showAdvanced)}
                    title={getFormatTitle(format, category, showAdvanced)}
                  />
                ))}
              </Form.Dropdown.Section>
            ))}
          </Form.Dropdown>
          <Advanced itemProps={itemProps} show={showAdvanced} video={video} onChange={setShowAdvanced} />
        </>
      )}
    </Form>
  );
}
