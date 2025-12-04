import React from "react";
import { Action, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { nounProjectData } from "./utils/nounData";
import { processSVGContent } from "./utils/helpers";
import { NounProjectDownloadResponse, IconProps } from "./utils/types";

const CopyImageIcon: React.FC<IconProps> = ({ iconId, color = "000000", iconName }) => {
  const copyIconAsVueComponent = async () => {
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

        // Format the component name
        const componentName = `${iconName.replace(/\s+/g, "")}Icon`;
        const capitalizedComponentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

        const componentString = `
<template>
  <svg :fill="color" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" x="0px" y="0px">
    ${svgContent}
  </svg>
</template>

<script>
export default {
  name: '${capitalizedComponentName}',
  props: {
    color: {
      type: String,
      default: '#${color}'
    }
  }
};
</script>
        `.trim();

        toast.style = Toast.Style.Success;
        toast.title = `${iconName} (#${color}) copied to clipboard as Vue component`;

        await Clipboard.copy(componentString);
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

  return <Action icon={Icon.CodeBlock} title={`Copy ${iconName} as Vue Component`} onAction={copyIconAsVueComponent} />;
};

export default CopyImageIcon;
