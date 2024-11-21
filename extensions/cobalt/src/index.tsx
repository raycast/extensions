import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import { runAppleScript, useForm } from "@raycast/utils";
import { mkdir } from "fs/promises";
import { Readable } from "stream";
import { useEffect, useState } from "react";
import fetch from "cross-fetch";
import path from "path";
import fs from "fs";
import type { CobaltRequest, CobaltResponse, FormValues } from "./types";
import { parse as parseContentDispositionHeader } from "content-disposition";

// official cobalt instance URLs that are no longer available
const oldCobaltInstances = ["https://co.wuk.sh", "https://api.cobalt.tools"];

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (oldCobaltInstances.includes(preferences.apiInstanceUrl)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Official Cobalt API no longer available",
        message:
          "Please update your preferences to use a self-hosted API instance.\n" +
          "If you do not have access to a custom instance, you may use https://cobalt.aelew.dev.",
        primaryAction: {
          title: "Open Preferences",
          shortcut: Keyboard.Shortcut.Common.Open,
          onAction: openExtensionPreferences,
        },
      });
    }
  }, [preferences]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(formValues) {
      setLoading(true);

      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "raycast-cobalt/20241120",
        "Content-Type": "application/json",
      };

      if (preferences.apiInstanceKey) {
        headers["Authorization"] = `Api-Key ${preferences.apiInstanceKey}`;
      }

      // this is intentional. cobalt requires an API key to restrict access based on user agent
      if (preferences.apiInstanceUrl === "https://cobalt.aelew.dev") {
        headers["Authorization"] = "Api-Key 00000000-0000-4000-a000-000000000000";
      }

      const body: CobaltRequest = {
        ...formValues,
        url: formValues.url.trim(),
        filenameStyle: preferences.filenameStyle,
        alwaysProxy: preferences.alwaysProxy,
        disableMetadata: preferences.disableMetadata,
        youtubeHLS: preferences.youtubeHLS,
        twitterGif: preferences.twitterGif,
        tiktokFullAudio: preferences.tiktokFullAudio,
        tiktokH265: preferences.tiktokH265,
      };

      fetch(preferences.apiInstanceUrl, {
        body: JSON.stringify(body),
        method: "POST",
        headers,
      })
        .then((response) => response.json())
        .then((result: CobaltResponse) => {
          switch (result.status) {
            case "tunnel":
            case "redirect":
              downloadFile(result.url, result.filename);
              break;
            case "picker":
              result.picker.forEach((item) => downloadFile(item.url));
              if (result.audio) {
                downloadFile(result.audio, result.audioFilename);
              }
              break;
            case "error":
              showToast(Toast.Style.Failure, "An unexpected error occurred", result.error.code);
              setLoading(false);
              break;
          }
        })
        .catch((error) => {
          showToast(Toast.Style.Failure, "An unexpected error occurred", error.toString());
          setLoading(false);
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

  async function downloadFile(url: string, filename?: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading file",
      message: "Starting...",
    });

    const response = await fetch(url);
    if (!response.body) {
      showToast(Toast.Style.Failure, "An unexpected error occurred", "Failed to retrieve stream body.");
      return;
    }

    if (!fs.existsSync(preferences.downloadDirectory)) {
      await mkdir(preferences.downloadDirectory);
    }

    if (!filename) {
      const contentDispositionHeader = response.headers.get("content-disposition");
      if (contentDispositionHeader) {
        filename = parseContentDispositionHeader(contentDispositionHeader).parameters.filename.replace(".none", ".mp3");
      } else {
        filename = url.substring(url.lastIndexOf("/") + 1).split("?")[0];
      }
    }

    const destination = path.resolve(preferences.downloadDirectory, filename);
    const writeStream = fs.createWriteStream(destination);

    const body = response.body as unknown as Readable;
    let bytes = 0;

    const BYTES_PER_MB = 1048576;

    body.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      toast.message = `${parseFloat((bytes / BYTES_PER_MB).toFixed(1))} MB`;
    });

    body.pipe(writeStream);

    writeStream.on("finish", () => {
      setLoading(false);
      writeStream.close();
      toast.style = Toast.Style.Success;
      toast.title = "Download complete";
      toast.message = `Saved to ${filename}`;
      if (preferences.notifyOnDownload) {
        runAppleScript(`display notification "Downloaded ${filename}!" with title "Cobalt" sound name "Glass"`);
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
      <Form.Dropdown id="downloadMode" title="Mode" storeValue>
        <Form.Dropdown.Item title="Auto" value="auto" />
        <Form.Dropdown.Item title="Audio" value="audio" />
        <Form.Dropdown.Item title="Mute" value="mute" />
      </Form.Dropdown>
      <Form.TextField title="URL" placeholder="Paste your link here" autoFocus {...itemProps.url} />
      <Form.Separator />
      <Form.Dropdown
        id="youtubeVideoCodec"
        title="Video codec"
        storeValue
        info={
          "Only applies to YouTube video downloads.\n\n" +
          "H.264: Best compatibility, average detail level. Max quality is 1080p.\n" +
          "AV1: Best quality, small file size, most detailed. Supports 8K & HDR.\n" +
          "VP9: Same quality as AV1, but 2x the file size. Supports 4K & HDR.\n\n" +
          "Pick H.264 if you want best compatibility, and AV1 if you want the best quality and efficiency."
        }
      >
        <Form.Dropdown.Item title="H.264 (mp4)" value="h264" />
        <Form.Dropdown.Item title="AV1 (mp4)" value="av1" />
        <Form.Dropdown.Item title="VP9 (webm)" value="vp9" />
      </Form.Dropdown>
      <Form.Dropdown
        id="videoQuality"
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
        <Form.Dropdown.Item title="240p" value="240" />
        <Form.Dropdown.Item title="144p" value="144" />
      </Form.Dropdown>
      <Form.Dropdown id="audioFormat" title="Audio format" info="Only applies to audio downloads." storeValue>
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
