import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  Action,
  ActionPanel,
  BrowserExtension,
  Clipboard,
  Detail,
  Form,
  getSelectedText,
  Icon,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useForm, usePromise } from "@raycast/utils";
import nanoSpawn from "nano-spawn";
import { DownloadOptions, isValidHHMM, isYouTubeURL, parseHHMM, preferences } from "./utils.js";

export default function DownloadVideo() {
  const [error, setError] = useState(0);

  const { handleSubmit, values, itemProps, setValue, setValidationError } = useForm<DownloadOptions>({
    initialValues: {
      url: "",
    },
    onSubmit: async (values) => {
      const options = ["-P", preferences.downloadPath];

      options.push("--ffmpeg-location", preferences.ffmpegPath);
      options.push("-f", "bv*[ext=mp4][vcodec^=avc]+ba[ext=m4a]/b[ext=mp4]");

      // if (!values.startTime && values.endTime) {
      //   options.push("--download-sections");
      //   options.push(`*0:00-${values.endTime}`);
      // } else if (values.startTime && !values.endTime) {
      //   options.push("--download-sections");
      //   options.push(`*${values.startTime}-*`);
      // } else if (values.startTime && values.endTime) {
      //   options.push("--download-sections");
      //   options.push(`*${values.startTime}-${values.endTime}`);
      // }

      const toast = await showToast({
        title: "Downloading Video",
        style: Toast.Style.Animated,
        message: "0%",
      });

      options.push("--progress");
      options.push("--print", "after_move:filepath");

      const process = spawn(preferences.ytdlPath, [...options, values.url]);

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

        toast.title = "Download Failed";
        toast.style = Toast.Style.Failure;
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
        if (!isYouTubeURL(value)) {
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
    async (url) => {
      if (!url) return;
      if (!isYouTubeURL(url)) return;

      const result = await nanoSpawn(
        preferences.ytdlPath,
        [preferences.forceIpv4 ? "--force-ipv4" : undefined, "-j", url].filter((x) => Boolean(x)),
      );
      return JSON.parse(result.stdout) as {
        title: string;
        duration: number;
        live_status: string;
        formats: {
          format_id: string;
          vcodec: string;
          acodec: string;
          video_ext: string;
          protocol: string;
          filesize_approx: number;
          resolution: string;
        }[];
      };
    },
    [values.url],
    {
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch video",
          message: error.message,
        });
      },
    },
  );

  useEffect(() => {
    if (video) {
      if (video.live_status !== "not_live") {
        setValidationError("url", "Live streams are not supported");
      }
    }
  }, [video]);

  useEffect(() => {
    (async () => {
      if (preferences.autoLoadUrlFromClipboard) {
        const clipboardText = await Clipboard.readText();
        if (clipboardText && isYouTubeURL(clipboardText)) {
          setValue("url", clipboardText);
          return;
        }
      }

      if (preferences.autoLoadUrlFromSelectedText) {
        try {
          const selectedText = await getSelectedText();
          if (selectedText && isYouTubeURL(selectedText)) {
            setValue("url", selectedText);
            return;
          }
        } catch {
          // Suppress the error if Raycast didn't find any selected text
        }
      }

      if (preferences.enableBrowserExtensionSupport) {
        try {
          const tabUrl = (await BrowserExtension.getTabs()).find((tab) => tab.active)?.url;
          if (tabUrl && isYouTubeURL(tabUrl)) setValue("url", tabUrl);
        } catch {
          // Suppress the error if Raycast didn't find browser extension
        }
      }
    })();
  }, []);

  const missingExecutable = useMemo(() => {
    if (!fs.existsSync(preferences.ytdlPath)) {
      return "yt-dlp";
    }
    if (!fs.existsSync(preferences.ffmpegPath)) {
      return "ffmpeg";
    }
    if (!fs.existsSync(preferences.ffprobePath)) {
      return "ffprobe";
    }
    return null;
  }, [error]);

  if (missingExecutable) {
    return <NotInstalled executable={missingExecutable} onRefresh={() => setError(error + 1)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Download}
            title="Download Video"
            onSubmit={(values) => {
              handleSubmit({ ...values, copyToClipboard: false } as DownloadOptions);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Title" text={video?.title ?? "Video not found"} />
      <Form.TextField
        autoFocus
        title="URL"
        placeholder="https://www.youtube.com/watch?v=xRMPKQweySE"
        {...itemProps.url}
      />
      {/*<Form.Separator />*/}
      {/*<Form.TextField*/}
      {/*  info="Optional. Specify when the output video should start. Follow the format HH:MM:SS or MM:SS."*/}
      {/*  title="Start Time"*/}
      {/*  placeholder="00:00"*/}
      {/*  {...itemProps.startTime}*/}
      {/*/>*/}
      {/*<Form.TextField*/}
      {/*  info="Optional. Specify when the output video should end. Follow the format HH:MM:SS or MM:SS."*/}
      {/*  title="End Time"*/}
      {/*  placeholder={video ? formatHHMM(video.duration) : "00:00"}*/}
      {/*  {...itemProps.endTime}*/}
      {/*/>*/}
    </Form>
  );
}

function NotInstalled({ executable, onRefresh }: { executable: string; onRefresh: () => void }) {
  return (
    <Detail
      actions={<AutoInstall onRefresh={onRefresh} />}
      markdown={`
# 🚨 Error: \`${executable}\` is not installed
This extension depends on a command-line utilty that is not detected on your system. You must install it continue.

If you have homebrew installed, simply press **⏎** to have this extension install it for you. Since \`${executable}\` is a heavy library, 
**it can take up 2 minutes to install**.

**Please do not close Raycast while the installation is in progress.**

To install homebrew, visit [this link](https://brew.sh)
  `}
    />
  );
}

function AutoInstall({ onRefresh }: { onRefresh: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ActionPanel>
      {!isLoading && (
        <Action
          title="Install with Homebrew"
          icon={Icon.Download}
          onAction={async () => {
            if (isLoading) return;

            setIsLoading(true);

            const toast = await showToast({ style: Toast.Style.Animated, title: "Installing ffmpeg..." });
            await toast.show();

            try {
              execSync(`zsh -l -c 'brew install ffmpeg'`);
              await toast.hide();
              onRefresh();
            } catch (e) {
              await toast.hide();
              console.error(e);
              await showToast({
                style: Toast.Style.Failure,
                title: "Error installing",
                message: "An unknown error occured while trying to install",
              });
            }
            setIsLoading(false);
          }}
        />
      )}
    </ActionPanel>
  );
}
