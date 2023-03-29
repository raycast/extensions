import { Action, ActionPanel, Clipboard, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import ytdl, { videoFormat } from "ytdl-core";
import { useEffect, useState } from "react";
import { FormValidation, useForm } from "@raycast/utils";
import prettyBytes from "pretty-bytes";
import { downloadAudio, downloadVideo } from "./utils";
import fs from "fs";

type Values = {
  url: string;
  format: string;
  copyToClipboard: boolean;
};

export default function DownloadVideo() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [formats, setFormats] = useState<videoFormat[]>([]);

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
    const ffmpegExists = fs.existsSync("/opt/homebrew/bin/ffmpeg");
    if (!ffmpegExists) {
      showToast({
        title: "FFmpeg not found",
        message: "Please install ffmpeg using `brew install ffmpeg`",
        style: Toast.Style.Failure,
      });
      popToRoot();
      return;
    }

    const ffprobeExists = fs.existsSync("/opt/homebrew/bin/ffprobe");
    if (!ffprobeExists) {
      showToast({
        title: "FFprobe not found",
        message: "Please install ffmpeg using `brew install ffmpeg`",
        style: Toast.Style.Failure,
      });
      popToRoot();
      return;
    }
  }, []);

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
