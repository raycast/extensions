import React from "react";
import { Action, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { nounProjectData } from "./utils/nounData";
import { processSVGContent } from "./utils/helpers";
import { NounProjectDownloadResponse, IconProps } from "./utils/types";

const CopySVG: React.FC<IconProps> = ({ iconId, color = "000000", iconName }) => {
  const copyIconAsInlineSVG = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Copying ${iconName} icon...`,
    });

    try {
      const { data } = (await nounProjectData(`icon/${iconId}/download?color=${color}&filetype=svg`)) as {
        data: NounProjectDownloadResponse;
      };

      if (data && data.base64_encoded_file) {
        const svgContent = processSVGContent(data.base64_encoded_file);
        const inlineSVGTag = `<svg fill="#${color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" x="0px" y="0px">${svgContent}</svg>`;

        toast.style = Toast.Style.Success;
        toast.title = `${iconName} (#${color}) copied to clipboard as inline SVG`;

        await Clipboard.copy(inlineSVGTag);
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

  return <Action icon={Icon.Code} title={`Copy ${iconName} as Inline SVG`} onAction={copyIconAsInlineSVG} />;
};

export default CopySVG;
