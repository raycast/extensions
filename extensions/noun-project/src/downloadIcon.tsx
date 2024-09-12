import React from "react";
import { Action, showToast, Toast, Clipboard } from "@raycast/api";
import { nounProjectData } from "./utils/nounData";
import fs from "fs";
import os from "os";
import path from "path";

// Utility function to convert base64 to a temporary file
async function base64ToFile(base64: string, contentType: string, fileName: string): Promise<string> {
  const filePath = path.join(os.tmpdir(), fileName);
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

interface DownloadIconActionProps {
  iconId: string;
}

 interface NounProjectDownloadResponse {
  base64_encoded_file: string;
  content_type: string;
  usage_limits: {
    monthly: {
      limit: number;
      usage: number;
    };
  };
}


const DownloadIconAction: React.FC<DownloadIconActionProps> = ({ iconId }) => {
  const downloadIcon = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading icon...",
    });

    try {
      const { data } = await nounProjectData(`icon/${iconId}/download?color=000000&filetype=svg`);
      
      if (data && data.base64_encoded_file) {
        const filePath = await base64ToFile(data.base64_encoded_file, "image/svg+xml", `${iconId}.svg`);
        await Clipboard.copy({ file: filePath });

        toast.style = Toast.Style.Success;
        toast.title = "Icon copied to clipboard";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to download icon";
      }
    } catch (error) {
      console.error("Error downloading icon:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "An error occurred while downloading the icon";
    }
  };

  return <Action title="Download Icon" onAction={downloadIcon} />;
};

export default DownloadIconAction;
