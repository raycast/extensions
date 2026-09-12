import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getMaterialDocumentById } from "@/data/lecture/materials";
import * as fs from "fs";
import * as path from "path";

type FileDownloadItemProps = {
  fileName: string;
  fileUrl: string;
};

export function FileDownloadItem({ fileName, fileUrl }: FileDownloadItemProps) {
  const [, setIsDownloading] = useState(false);

  const getFileIcon = (fileName: string): Icon => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return Icon.Document;
      case "doc":
      case "docx":
        return Icon.Document;
      case "ppt":
      case "pptx":
        return Icon.Document;
      case "xls":
      case "xlsx":
        return Icon.Document;
      case "zip":
      case "rar":
        return Icon.Box;
      case "jpg":
      case "jpeg":
      case "png":
        return Icon.Image;
      default:
        return Icon.Document;
    }
  };

  const getFileExtension = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ext ? `.${ext}` : "";
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading...",
      message: fileName,
    });

    try {
      const preferences = getPreferenceValues<Preferences>();
      const downloadPath = preferences.downloadPath;

      if (!downloadPath) throw new Error("Download path not configured");

      const fileData = await getMaterialDocumentById(fileUrl);

      if (!fileData) throw new Error("Failed to download file");

      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      const filePath = path.join(downloadPath, fileName);
      const buffer = Buffer.from(fileData);
      fs.writeFileSync(filePath, buffer);

      toast.style = Toast.Style.Success;
      toast.title = "Downloaded Successfully";
      toast.message = `Saved to: ${filePath}`;
    } catch (error) {
      console.error("Download error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Download Failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
    setIsDownloading(false);
  };

  return (
    <List.Item
      icon={getFileIcon(fileName)}
      title={fileName}
      accessories={[{ text: getFileExtension(fileName).toUpperCase(), icon: Icon.Download }]}
      actions={
        <ActionPanel>
          <Action
            title="Download File"
            icon={Icon.Download}
            onAction={handleDownload}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
          />
        </ActionPanel>
      }
    />
  );
}
