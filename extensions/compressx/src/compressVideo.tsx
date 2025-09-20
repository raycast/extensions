import {
  showToast,
  Toast,
  getSelectedFinderItems,
  ActionPanel,
  Action,
  Form,
  popToRoot,
  LocalStorage,
} from "@raycast/api";
import { exec } from "child_process";
import { checkCompressXInstallation } from "./utils/checkInstall";
import { useState, useEffect } from "react";
import path from "path";

export default function Command() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [fileTypes, setFileTypes] = useState<Set<"video" | "image">>(new Set());
  const [quality, setQuality] = useState<string>("high");
  const [videoFormat, setVideoFormat] = useState<string>("same");
  const [imageFormat, setImageFormat] = useState<string>("same");

  useEffect(() => {
    checkCompressXInstallation().then(setIsInstalled);
    getSelectedFinderItems().then((items) => {
      if (items.length > 0) {
        const paths = items.map((item) => item.path);
        setSelectedFiles(paths);

        // Determine file types
        const types = new Set<"video" | "image">();
        paths.forEach((filePath) => {
          const ext = path.extname(filePath).toLowerCase();
          if (ext.match(/\.(mp4|mov|avi|mkv|webm)$/)) {
            types.add("video");
          } else {
            types.add("image");
          }
        });
        setFileTypes(types);
      }
    });

    // Load saved preferences
    LocalStorage.getItem<string>("savedQuality").then((savedQuality) => {
      if (savedQuality) setQuality(savedQuality);
    });
    LocalStorage.getItem<string>("savedVideoFormat").then((savedFormat) => {
      if (savedFormat) setVideoFormat(savedFormat);
    });
    LocalStorage.getItem<string>("savedImageFormat").then((savedFormat) => {
      if (savedFormat) setImageFormat(savedFormat);
    });
  }, []);

  const qualityOptions = [
    { title: "High", value: "high" },
    { title: "Good", value: "good" },
    { title: "Medium", value: "medium" },
    { title: "Acceptable", value: "acceptable" },
  ];

  const videoFormatOptions = [
    { title: "Same as input", value: "same" },
    { title: "MP4", value: "mp4" },
    { title: "WebM", value: "webm" },
  ];

  const imageFormatOptions = [
    { title: "Same as input", value: "same" },
    { title: "PNG", value: "png" },
    { title: "JPG", value: "jpg" },
    { title: "WebP", value: "webp" },
  ];

  const compressFiles = async (values: { quality: string; videoFormat?: string; imageFormat?: string }) => {
    if (selectedFiles.length === 0) return;

    try {
      const paths = selectedFiles.join("|");
      let url = `compresto://open?path=${paths}&quality=${values.quality}`;

      // Add format parameters if they exist
      if (values.videoFormat && fileTypes.has("video")) {
        url += `&videoFormat=${values.videoFormat}`;
      }
      if (values.imageFormat && fileTypes.has("image")) {
        url += `&imageFormat=${values.imageFormat}`;
      }

      exec(`open "${url}"`);

      // Save user preferences
      await LocalStorage.setItem("savedQuality", values.quality);
      if (values.videoFormat) {
        await LocalStorage.setItem("savedVideoFormat", values.videoFormat);
      }
      if (values.imageFormat) {
        await LocalStorage.setItem("savedImageFormat", values.imageFormat);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Sent to Compresto for compressing",
        message: `${selectedFiles.length} files selected`,
      });
      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: e instanceof Error ? e.message : "An error occurred",
      });
    }
  };

  if (isInstalled === null || selectedFiles.length === 0 || fileTypes.size === 0) {
    return <Form isLoading={true} />;
  }

  if (isInstalled === false) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Install Compresto" url="https://compresto.app" />
          </ActionPanel>
        }
      >
        <Form.Description text="Compresto is not installed. Please install it to use this extension." />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compress Files" onSubmit={compressFiles} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="quality" title="Quality" value={quality} onChange={setQuality}>
        {qualityOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      {fileTypes.has("video") && (
        <Form.Dropdown id="videoFormat" title="Video Format" value={videoFormat} onChange={setVideoFormat}>
          {videoFormatOptions.map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.Dropdown>
      )}

      {fileTypes.has("image") && (
        <Form.Dropdown id="imageFormat" title="Image Format" value={imageFormat} onChange={setImageFormat}>
          {imageFormatOptions.map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Description text={`Selected ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}`} />
    </Form>
  );
}
