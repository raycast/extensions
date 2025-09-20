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
  isValidHHMM,
  isValidUrl,
  parseHHMM,
} from "./utils.js";
import { Video } from "./types.js";
import Installer from "./views/installer.js";
import Updater from "./views/updater.js";

const {
  downloadPath,
  autoLoadUrlFromClipboard,
  autoLoadUrlFromSelectedText,
  enableBrowserExtensionSupport,
  forceIpv4,
} = getPreferenceValues<ExtensionPreferences>();

export default function DownloadVideo() {
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
      const options = ["-P", downloadPath];
      const [downloadFormat, recodeFormat] = values.format.split("#");

      options.push("--ffmpeg-location", ffmpegPath);
      options.push("--format", downloadFormat);
      options.push("--recode-video", recodeFormat);

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

  const { data: video, isLoading } = usePromise(
    async (url: string) => {
      if (!url) return;
      if (!isValidUrl(url)) return;

      const result = await execa(
        ytdlPath,
        [forceIpv4 ? "--force-ipv4" : "", "--dump-json", "--format-sort=resolution,ext,tbr", url].filter((x) =>
          Boolean(x),
        ),
      );
      return JSON.parse(result.stdout) as Video;
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
    </Form>
  );
}
