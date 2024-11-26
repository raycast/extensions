import { Action, ActionPanel, Clipboard, Detail, Form, Icon, showToast, Toast } from "@raycast/api";
import ytdl, { videoFormat } from "@distube/ytdl-core";
import { useEffect, useMemo, useState, Fragment } from "react";
import { FormValidation, useForm } from "@raycast/utils";
import prettyBytes from "pretty-bytes";
import {
  downloadAudio,
  downloadVideo,
  parseHHMM,
  FormatOptions,
  DownloadOptions,
  preferences,
  formatHHMM,
  isValidHHMM,
} from "./utils";
import { execSync } from "child_process";
import fs from "fs";

export default function DownloadVideo() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [formats, setFormats] = useState<videoFormat[]>([]);
  const [error, setError] = useState(0);
  const [duration, setDuration] = useState(0);

  const { handleSubmit, values, itemProps, setValue, setValidationError } = useForm<DownloadOptions>({
    onSubmit: async (values) => {
      setLoading(true);

      if (isSelectedAudio) {
        await downloadAudio(values.url, values);
      } else {
        await downloadVideo(values.url, values);
      }

      setLoading(false);
    },
    validation: {
      url: (value) => {
        if (!value) {
          return "URL is required";
        }
        if (!ytdl.validateURL(value)) {
          return "Invalid YouTube URL";
        }
      },
      format: FormValidation.Required,
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
          if (parseHHMM(value) > duration) {
            return "End time is greater than video duration";
          }
        }
      },
    },
  });

  useEffect(() => {
    if (values.url && ytdl.validateURL(values.url)) {
      setLoading(true);
      ytdl
        .getInfo(values.url)
        .then((info) => {
          const videoDuration = parseInt(info.videoDetails.lengthSeconds);
          const isLiveStream = info.videoDetails.isLiveContent && videoDuration === 0;
          const isLivePremiere = info.videoDetails.liveBroadcastDetails?.isLiveNow;
          if (isLiveStream || isLivePremiere) {
            showToast({
              style: Toast.Style.Failure,
              title: isLiveStream
                ? "Live streams are not supported"
                : "Live premieres are not supported. Please download the video after the live premiere.",
            });
            return;
          }
          setLoading(false);
          setDuration(videoDuration);
          setTitle(info.videoDetails.title);
          setFormats(info.formats);
        })
        .catch(() => {
          setValidationError("url", "Video not found");
        });
    }
  }, [values.url]);

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && ytdl.validateURL(text)) {
        setValue("url", text);
      }
    });
  }, []);

  const missingExecutable = useMemo(() => {
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

  const currentFormat = JSON.parse(values.format || "{}");
  const audioFormats = deduplicateByKey(
    ytdl.filterFormats(formats, "audioonly").filter((format) => format.container === "mp4"),
    (x) => {
      return serializeFormatOptions({
        itag: x.itag.toString(),
        container: x.container,
      });
    }
  );
  const isSelectedAudio = currentFormat.itag === audioFormats[0]?.itag.toString();
  const audioContentLength = audioFormats[0]?.contentLength ?? "0";
  const videoFormats = deduplicateByKey(
    ytdl
      .filterFormats(formats, "videoonly")
      .filter((format) => (format.container === "mp4" && !format.colorInfo) || format.container === "webm"),
    (x) => {
      return serializeFormatOptions({
        itag: x.itag.toString(),
        container: x.container,
      });
    }
  );

  function serializeFormatOptions(options: FormatOptions) {
    return JSON.stringify(options);
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Download}
            title={isSelectedAudio ? "Download Audio" : "Download Video"}
            onSubmit={(values) => {
              handleSubmit({ ...values, copyToClipboard: false } as DownloadOptions);
            }}
          />
          <Action.SubmitForm
            icon={Icon.CopyClipboard}
            title={isSelectedAudio ? "Copy Audio" : "Copy Video"}
            onSubmit={(values) => {
              handleSubmit({ ...values, copyToClipboard: true } as DownloadOptions);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Title" text={title || "No video selected"} />
      <Form.TextField
        autoFocus
        title="URL"
        placeholder="https://www.youtube.com/watch?v=xRMPKQweySE"
        {...itemProps.url}
      />
      <Form.Dropdown title="Format" {...itemProps.format}>
        {["mp4", "webm"].map((container) => (
          <Form.Dropdown.Section key={container} title={`Video (${container})`}>
            {videoFormats
              .filter((format) => format.container == container)
              .map((format, index) => (
                <Form.Dropdown.Item
                  key={`${format.itag}-${format.quality}-${container}-${index}`}
                  value={serializeFormatOptions({
                    itag: format.itag.toString(),
                    container: container,
                  })}
                  keywords={[container, "video"]}
                  title={`${format.qualityLabel} (${
                    format.contentLength
                      ? prettyBytes(parseInt(format.contentLength) + parseInt(audioContentLength))
                      : ""
                  }) [${container}]`}
                  icon={Icon.Video}
                />
              ))}
          </Form.Dropdown.Section>
        ))}
        <Form.Dropdown.Section title="Audio">
          {audioFormats.map((format, index) => (
            <Fragment key={`${format.itag}-${format.audioBitrate}-${index}`}>
              <Form.Dropdown.Item
                key={`${format.itag}-${format.audioBitrate}-${index}-mp3`}
                keywords={["mp3", "audio"]}
                value={JSON.stringify({ itag: format.itag.toString() } as FormatOptions)}
                title={`${format.audioBitrate}kps (${prettyBytes(parseInt(format.contentLength))})`}
                icon={Icon.Music}
              />
              <Form.Dropdown.Item
                key={`${format.itag}-${format.audioBitrate}-${index}-wav`}
                keywords={["wav", "audio"]}
                value={JSON.stringify({ itag: format.itag.toString(), wav: true } as FormatOptions)}
                title={`${format.audioBitrate}kps (WAV)`}
                icon={Icon.Music}
              />
            </Fragment>
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        info="Optional. Specify when the output video should start. Follow the format HH:MM:SS or MM:SS."
        title="Start Time"
        placeholder="00:00"
        {...itemProps.startTime}
      />
      <Form.TextField
        info="Optional. Specify when the output video should end. Follow the format HH:MM:SS or MM:SS."
        title="End Time"
        placeholder={duration ? formatHHMM(duration) : "00:00"}
        {...itemProps.endTime}
      />
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

To install homebrew, visit [this link](https://brew.sh)
  `}
    />
  );
}

function deduplicateByKey<T>(array: T[], key: (x: T) => string): T[] {
  const seen = new Set();
  return array.filter((item) => {
    const itemKey = key(item);
    if (seen.has(itemKey)) {
      return false;
    }
    seen.add(itemKey);
    return true;
  });
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
