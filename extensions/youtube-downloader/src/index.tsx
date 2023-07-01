import { Action, ActionPanel, Clipboard, Detail, Form, Icon, showToast, Toast } from "@raycast/api";
import ytdl, { videoFormat } from "ytdl-core";
import React, { useEffect, useState } from "react";
import { FormValidation, useForm } from "@raycast/utils";
import prettyBytes from "pretty-bytes";
import { downloadAudio, downloadVideo } from "./utils";
import fs from "fs";
import { execSync } from "child_process";

type Values = {
  url: string;
  format: string;
  copyToClipboard: boolean;
};

export default function DownloadVideo() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [formats, setFormats] = useState<videoFormat[]>([]);
  const [, setError] = useState(true);

  const { handleSubmit, values, itemProps, setValue } = useForm<Values>({
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
    },
  });

  useEffect(() => {
    if (values.url && ytdl.validateURL(values.url)) {
      setLoading(true);
      ytdl.getInfo(values.url).then((info) => {
        setLoading(false);
        setTitle(info.videoDetails.title);
        setFormats(info.formats);
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

  const ffmpegExists = fs.existsSync("/opt/homebrew/bin/ffmpeg");
  const ffprobeExists = fs.existsSync("/opt/homebrew/bin/ffprobe");
  if (!ffmpegExists || !ffprobeExists) {
    return <NotInstalled onRefresh={() => setError(false)} />;
  }

  const audioFormats = ytdl.filterFormats(formats, "audioonly").filter((format) => format.container === "mp4");
  const isSelectedAudio = values.format === audioFormats[0]?.itag.toString();
  const audioContentLength = audioFormats[0]?.contentLength ?? "0";
  const videoFormats = ytdl
    .filterFormats(formats, "videoonly")
    .filter((format) => format.container === "mp4" && !format.colorInfo);

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Download}
            title={isSelectedAudio ? "Download Audio" : "Download Video"}
            onSubmit={(values) => {
              handleSubmit({ ...values, copyToClipboard: false } as Values);
            }}
          />
          <Action.SubmitForm
            icon={Icon.CopyClipboard}
            title={isSelectedAudio ? "Copy Audio" : "Copy Video"}
            onSubmit={(values) => {
              handleSubmit({ ...values, copyToClipboard: true } as Values);
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
        <Form.Dropdown.Section title="Video">
          {videoFormats.map((format) => (
            <Form.Dropdown.Item
              key={format.itag}
              value={format.itag.toString()}
              title={`${format.qualityLabel} (${
                format.contentLength ? prettyBytes(parseInt(format.contentLength) + parseInt(audioContentLength)) : ""
              })`}
              icon={Icon.Video}
            />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Audio">
          {audioFormats.map((format) => (
            <Form.Dropdown.Item
              key={format.itag}
              value={format.itag.toString()}
              title={`${format.audioBitrate}kps (${prettyBytes(parseInt(format.contentLength))})`}
              icon={Icon.Music}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}

function NotInstalled({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Detail
      actions={<AutoInstall onRefresh={onRefresh} />}
      markdown={`
# 🚨 Error: \`ffmpeg\` is not installed
This extension depends on a command-line utilty that is not detected on your system. You must install it continue.

If you have homebrew installed, simply press **⏎** to have this extension install it for you. Since \`ffmpeg\` is a heavy library, 
**it can take up 2 minutes to install**.

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
