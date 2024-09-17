import React from "react";
import { Action, showToast, Toast, Clipboard } from "@raycast/api";
import { nounProjectData } from "./utils/nounData";
import { base64ToFile } from "./utils/helpers";

interface CopyIconActionProps {
  iconId: string;
  iconName: string;
	color?: string;
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

const CopyIconAction: React.FC<CopyIconActionProps> = ({ iconId, color = "000000", iconName }) => {
  const downloadIcon = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Copying ${iconName} icon...`,
    });

    try {
      const { data } = await nounProjectData(`icon/${iconId}/download?color=${color}&filetype=png&size=1028`) as { data: NounProjectDownloadResponse };

      if (data && data.base64_encoded_file) {
        const filePath = await base64ToFile(data.base64_encoded_file, `${iconName}-${iconId}.png`);
        await Clipboard.copy({ file: filePath });

        toast.style = Toast.Style.Success;
        toast.title = `${iconName} (#${color}) icon copied to clipboard`
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to copy ${iconName} icon`;
      }
    } catch (error) {
      console.error("Error copying icon:", error);
      toast.style = Toast.Style.Failure;
      toast.title = `An error occurred while downloading the ${iconName} icon`;
    }
  };

  return <Action title="Download Icon" onAction={downloadIcon} />;
};

export default CopyIconAction;
