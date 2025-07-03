import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  Keyboard,
  launchCommand,
  LaunchType,
  Icon,
} from "@raycast/api";
import { useForm, runAppleScript } from "@raycast/utils";
import { mkdir } from "fs/promises";
import { Readable } from "stream";
import { useEffect, useState } from "react";
import path from "path";
import fs from "fs";
import type { CobaltRequest, CobaltResponse, FormValues } from "./types";
import { parse as parseContentDispositionHeader } from "content-disposition";
import { addToHistory } from "./history";
import { getServiceFromUrl, generateThumbnail } from "./utils";

// official cobalt instance URLs that are no longer available
const oldCobaltInstances = ["https://co.wuk.sh", "https://api.cobalt.tools"];

export default function DownloadCommand() {
  const preferences = getPreferenceValues<Preferences.Index>();
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
      if (!preferences.apiInstanceUrl.trim()) {
        showToast(
          Toast.Style.Failure,
          "API Instance URL not configured",
          "Please set an API Instance URL in preferences.",
        );
        return;
      }

      let apiUrl;
      try {
        apiUrl = new URL(preferences.apiInstanceUrl.trim());
        if (apiUrl.protocol !== "http:" && apiUrl.protocol !== "https:") {
          throw new Error("Invalid protocol");
        }
      } catch {
        showToast(
          Toast.Style.Failure,
          "Invalid API Instance URL",
          "Please check your API Instance URL in preferences.",
        );
        return;
      }

      setLoading(true);

      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "raycast-cobalt/20241120",
        "Content-Type": "application/json",
      };

      if (preferences.apiInstanceUrl === "https://cobalt.aelew.dev") {
        headers["Authorization"] = "Api-Key 00000000-0000-4000-a000-000000000000";
      } else if (preferences.apiInstanceKey) {
        headers["Authorization"] = `Api-Key ${preferences.apiInstanceKey}`;
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
        .then((response) => response.json() as Promise<CobaltResponse>)
        .then(async (result) => {
          switch (result.status) {
            case "tunnel":
            case "redirect":
              downloadFile(result.url, result.filename, formValues.url, body);
              break;
            case "picker":
              result.picker.forEach((item) => downloadFile(item.url, undefined, formValues.url, body));
              if (result.audio) {
                downloadFile(result.audio, result.audioFilename, formValues.url, body);
              }
              break;
            case "error": {
              const errorCode = result.error.code;
              let errorTitle = "An unexpected error occurred";
              let errorMessage = errorCode;

              if (errorCode === "error.api.youtube.login") {
                errorTitle = "YouTube access blocked";
                errorMessage =
                  "YouTube is blocking this API instance. Try a different instance or wait and retry later.";
              } else if (errorCode.startsWith("error.api.youtube")) {
                errorTitle = "YouTube error";
                errorMessage = "YouTube is restricting access. This is usually temporary.";
              } else if (errorCode === "error.api.rate_limit") {
                errorTitle = "Rate limit exceeded";
                errorMessage = "Too many requests. Please wait a moment and try again.";
              }

              addToHistory({
                url: formValues.url,
                filename: "Failed download",
                downloadPath: "",
                service: getServiceFromUrl(formValues.url),
                downloadMode: body.downloadMode || "auto",
                videoQuality: body.videoQuality,
                audioFormat: body.audioFormat,
                status: "failed",
                errorMessage: errorMessage,
                thumbnailUrl: null,
              });

              showToast(Toast.Style.Failure, errorTitle, errorMessage);
              setLoading(false);
              break;
            }
          }
        })
        .catch((error) => {
          addToHistory({
            url: formValues.url,
            filename: "Failed download",
            downloadPath: "",
            service: getServiceFromUrl(formValues.url),
            downloadMode: body.downloadMode || "auto",
            videoQuality: body.videoQuality,
            audioFormat: body.audioFormat,
            status: "failed",
            errorMessage: error.toString(),
            thumbnailUrl: null,
          });
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

  async function downloadFile(url: string, filename?: string, originalUrl?: string, requestBody?: CobaltRequest) {
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
      await mkdir(preferences.downloadDirectory, { recursive: true });
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

    const body = Readable.fromWeb(response.body);
    let bytes = 0;

    const BYTES_PER_MB = 1048576;

    body.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      toast.message = `${parseFloat((bytes / BYTES_PER_MB).toFixed(1))} MB`;
    });

    body.pipe(writeStream);

    writeStream.on("finish", async () => {
      setLoading(false);
      writeStream.close();
      toast.style = Toast.Style.Success;
      toast.title = "Download complete";
      toast.message = `Saved to ${filename}`;
      toast.primaryAction = {
        title: "View in History",
        shortcut: { modifiers: ["cmd"], key: "h" },
        onAction: () => {
          toast.hide();
          launchCommand({
            name: "history",
            type: LaunchType.UserInitiated,
          }).catch(() => {
            showToast(Toast.Style.Failure, "Could not open history");
          });
        },
      };
      if (preferences.notifyOnDownload) {
        runAppleScript(`display notification "Downloaded ${filename}!" with title "Cobalt" sound name "Glass"`);
      }

      const thumbnailPath = await generateThumbnail(destination);

      addToHistory({
        url: originalUrl || url,
        filename,
        downloadPath: destination,
        service: getServiceFromUrl(originalUrl || url),
        downloadMode: requestBody?.downloadMode || "auto",
        videoQuality: requestBody?.videoQuality,
        audioFormat: requestBody?.audioFormat,
        status: "completed",
        thumbnailUrl: thumbnailPath,
      });
    });

    writeStream.on("error", async (err) => {
      fs.unlinkSync(destination);
      toast.style = Toast.Style.Failure;
      toast.title = err.name;
      toast.message = err.message;
      setLoading(false);

      addToHistory({
        url: originalUrl || url,
        filename,
        downloadPath: destination,
        service: getServiceFromUrl(originalUrl || url),
        downloadMode: requestBody?.downloadMode || "auto",
        videoQuality: requestBody?.videoQuality,
        audioFormat: requestBody?.audioFormat,
        status: "failed",
        errorMessage: err.message,
        thumbnailUrl: null,
      });
    });
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          {loading ? null : (
            <>
              <Action.SubmitForm title="Start Download" onSubmit={handleSubmit} />
              <Action
                title="View Download History"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
                onAction={() => launchCommand({ name: "history", type: LaunchType.UserInitiated })}
              />
            </>
          )}
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
      <Form.Description text="More options are available in your extension settings." />
    </Form>
  );
}
