import React from "react";
import { Action, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { nounProjectData } from "./utils/nounData";
import { processSVGContent } from "./utils/helpers";
import { NounProjectDownloadResponse, IconProps } from "./utils/types";

const CopyReactComponent: React.FC<IconProps> = ({ iconId, color = "000000", iconName }) => {
  const copyIconAsReactComponent = async () => {
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
import React from "react";

interface ${capitalizedComponentName}Props {
	color?: string;
}

const ${capitalizedComponentName}: React.FC<${capitalizedComponentName}Props> = ({ color = "#${color}" }) => (
	<svg fill={color} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" x="0px" y="0px">
		${svgContent}
	</svg>
);

export default ${capitalizedComponentName};
        `.trim();

        toast.style = Toast.Style.Success;
        toast.title = `${iconName} (#${color}) copied to clipboard as React component`;

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

  return (
    <Action icon={Icon.CodeBlock} title={`Copy ${iconName} as React Component`} onAction={copyIconAsReactComponent} />
  );
};

export default CopyReactComponent;
