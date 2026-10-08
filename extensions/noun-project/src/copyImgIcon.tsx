import React from "react";
import { Action, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { nounProjectData } from "./utils/nounData";
import { NounProjectDownloadResponse, IconProps } from "./utils/types";

const CopyImageIcon: React.FC<IconProps> = ({ iconId, color = "000000", iconName }) => {
  const copyIconAsInlineImage = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Copying ${iconName} icon...`,
    });

    try {
      const { data } = (await nounProjectData(`icon/${iconId}/download?color=${color}&filetype=png&size=1028`)) as {
        data: NounProjectDownloadResponse;
      };

      if (data && data.base64_encoded_file) {
        const base64Image = `data:${data.content_type};base64,${data.base64_encoded_file}`;
        const htmlImageTag = `<img src="${base64Image}" alt="${iconName}" />`;

        toast.style = Toast.Style.Success;
        toast.title = `${iconName} (#${color}) copied to clipboard as <img/>`;

        await Clipboard.copy(htmlImageTag);
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

  return <Action icon={Icon.Image} title={`Copy ${iconName} as Inline Image`} onAction={copyIconAsInlineImage} />;
};

export default CopyImageIcon;
