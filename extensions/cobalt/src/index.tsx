import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { runAppleScript, useForm } from "@raycast/utils";
import { mkdir } from "fs/promises";
import { Readable } from "stream";
import { useState } from "react";
import fetch from "cross-fetch";
import path from "path";
import fs from "fs";

type FormValues = {
  mode: "auto" | "audio";
  vCodec: "h264" | "av1" | "vp9";
  vQuality: "max" | "2160" | "1440" | "1080" | "720" | "480" | "360";
  aFormat: "best" | "mp3" | "ogg" | "wav" | "opus";
  url: string;
};

type CobaltResponse =
  | { status: "stream"; url: string }
  | { status: "redirect"; url: string }
  | { status: "picker"; pickerType: "various" | "images"; picker: PickerItem[] }
  | { status: "error"; text: string }
  | { status: "success"; text: string }
  | { status: "rate-limit"; text: string };

type PickerItem = { type: "video"; thumb: string; url: string };

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  const [loading, setLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      setLoading(true);

      const url = values.url.trim();
      const payload: Record<string, unknown> = { url, aFormat: values.aFormat, dubLang: false };

      if (preferences.vimeoDownloadType === "dash") {
        payload.vimeoDash = true;
      }
      if (values.mode === "audio") {
        payload.isAudioOnly = true;
        payload.isNoTTWatermark = true;
        payload.isTTFullAudio = preferences.downloadOriginalTikTokSound;
      } else {
        payload.vQuality = values.vQuality;
        payload.isAudioMuted = preferences.muteVideoAudio;
        if (url.includes("youtube.com/") || url.includes("/youtu.be/")) {
          payload.vCodec = values.vCodec;
        } else if (url.includes("tiktok.com/") || url.includes("douyin.com/")) {
          payload.isNoTTWatermark = preferences.removeTikTokWatermark;
          payload.isTTFullAudio = preferences.downloadOriginalTikTokSound;
        }
      }

      fetch(`${preferences.apiInstanceUrl}/api/json`, {
        headers: { "user-agent": "raycast-cobalt", "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
        method: "POST",
      })
        .then((response) => response.json())
        .then((result: CobaltResponse) => {
          switch (result.status) {
            case "stream":
            case "redirect":
              downloadFile(result.url);
              break;
            case "picker":
              result.picker.forEach((item) => downloadFile(item.url));
              break;
            case "error":
            case "success":
            case "rate-limit":
              showToast(Toast.Style.Failure, "An unexpected error occurred", result.text);
              setLoading(false);
              break;
          }
        });
    },
    validation: {
      url: (value) => {
        const INVALID_URL = "Please enter a valid URL.";
        const trimmedValue = value?.trim();

        if (!trimmedValue?.length) {
          return INVALID_URL;
        }

        let url;
        try {
          url = new URL(trimmedValue);
        } catch {
          return INVALID_URL;
        }

        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return INVALID_URL;
        }
      },
    },
  });

  async function downloadFile(url: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading file", message: "Starting..." });

    const response = await fetch(url);
    if (!response.body) {
      showToast(Toast.Style.Failure, "An unexpected error occurred", "Failed to retrieve stream body.");
      return;
    }

    // Use the file name from the content-disposition header if available. Otherwise, use the last part of the provided URL.
    const fileName =
      response.headers.get("content-disposition")?.split('filename="')[1].slice(0, -1).replace(".none", ".mp3") ??
      url.substring(url.lastIndexOf("/") + 1).split("?")[0];

    if (!fs.existsSync(preferences.downloadDirectory)) {
      await mkdir(preferences.downloadDirectory);
    }

    const destination = path.resolve(preferences.downloadDirectory, fileName);
    const writeStream = fs.createWriteStream(destination);

    const body = response.body as unknown as Readable;
    const BYTES_PER_MB = 1048576;
    let bytes = 0;

    body.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      toast.message = parseFloat((bytes / BYTES_PER_MB).toFixed(1)) + " MB";
    });

    body.pipe(writeStream);

    writeStream.on("finish", () => {
      setLoading(false);
      writeStream.close();
      toast.style = Toast.Style.Success;
      toast.title = "Download complete";
      toast.message = "Saved to " + fileName;
      if (preferences.notifyOnDownload) {
        runAppleScript(`display notification "Downloaded ${fileName}!" with title "Cobalt" sound name "Glass"`);
      }
    });

    writeStream.on("error", (err) => {
      fs.unlinkSync(destination);
      toast.style = Toast.Style.Failure;
      toast.title = err.name;
      toast.message = err.message;
    });
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          {loading ? null : <Action.SubmitForm title="Start Download" onSubmit={handleSubmit} />}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode" storeValue>
        <Form.Dropdown.Item title="Auto" value="auto" />
        <Form.Dropdown.Item title="Audio" value="audio" />
      </Form.Dropdown>
      <Form.TextField title="URL" placeholder="Paste your link here" autoFocus {...itemProps.url} />
      <Form.Separator />
      <Form.Dropdown
        id="vCodec"
        title="Video codec"
        storeValue
        info={
          "Only applies to YouTube video downloads.\n\n" +
          "H264: best player support, but quality maxs out at 1080p.\n" +
          "AV1: low player support, but supports 8K & HDR.\n" +
          "VP9: usually highest bitrate, preserves most detail. supports 4K & HDR.\n\n" +
          "Pick H264 if you want best editor/player/social media compatibility."
        }
      >
        <Form.Dropdown.Item title="H264 (mp4)" value="h264" />
        <Form.Dropdown.Item title="AV1 (mp4)" value="av1" />
        <Form.Dropdown.Item title="VP9 (webm)" value="vp9" />
      </Form.Dropdown>
      <Form.Dropdown
        id="vQuality"
        title="Video quality"
        defaultValue="max"
        storeValue
        info={
          "Only applies to video downloads.\n" +
          "If the selected quality isn't available, the closest one will be used instead."
        }
      >
        <Form.Dropdown.Item title="Maximum" value="max" />
        <Form.Dropdown.Item title="2160p" value="2160" />
        <Form.Dropdown.Item title="1440p" value="1440" />
        <Form.Dropdown.Item title="1080p" value="1080" />
        <Form.Dropdown.Item title="720p" value="720" />
        <Form.Dropdown.Item title="480p" value="480" />
        <Form.Dropdown.Item title="360p" value="360" />
      </Form.Dropdown>
      <Form.Dropdown id="aFormat" title="Audio format" info="Only applies to audio downloads." storeValue>
        <Form.Dropdown.Item title="Best" value="best" />
        <Form.Dropdown.Item title="mp3" value="mp3" />
        <Form.Dropdown.Item title="ogg" value="ogg" />
        <Form.Dropdown.Item title="wav" value="wav" />
        <Form.Dropdown.Item title="opus" value="opus" />
      </Form.Dropdown>
      <Form.Description text="Additional options are available in your extension settings." />
    </Form>
  );
}
