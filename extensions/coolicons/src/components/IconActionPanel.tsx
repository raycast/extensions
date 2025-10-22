import {
  Action,
  ActionPanel,
  Clipboard,
  showHUD,
  Icon,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import { getIconUrl, iconCategoryMap } from "../utils/helpers";
import React, { FC } from "react";

interface Preferences {
  iconSize: string;
  iconColor: string;
}

type Props = {
  name: string;
  componentName: string;
};

const IconActionPanel: FC<Props> = ({ name, componentName }) => {
  const iconUrl = getIconUrl(name);
  const preferences = getPreferenceValues<Preferences>();
  const size = preferences.iconSize || "24";
  const color = preferences.iconColor || "#000000";
  const category = iconCategoryMap[name] || "Interface";

  // Get PNG URLs for both colors
  const blackPngUrl = `https://raw.githubusercontent.com/krystonschwarze/coolicons/master/coolicons%20PNG/Black/${category}/${name}.png`;
  const whitePngUrl = `https://raw.githubusercontent.com/krystonschwarze/coolicons/master/coolicons%20PNG/White/${category}/${name}.png`;

  return (
    <ActionPanel title="Copy to Clipboard">
      <Action.CopyToClipboard
        title="Copy React Native Component"
        content={`<${componentName} size={${size}} color="${color}" />`}
        icon={Icon.Mobile}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      <Action.CopyToClipboard title="Copy Name" content={name} />
      <Action
        title="Copy Svg Code"
        icon={Icon.Code}
        onAction={async () => {
          try {
            const response = await fetch(iconUrl);
            const svgContent = await response.text();
            await Clipboard.copy(svgContent);
            await showHUD("SVG Copied to Clipboard");
          } catch (error) {
            await showHUD("Failed to fetch SVG");
          }
        }}
      />
      <Action.CopyToClipboard title="Copy Black Png to Clipboard" content={blackPngUrl} icon={Icon.Image} />
      <Action.CopyToClipboard title="Copy White Png to Clipboard" content={whitePngUrl} icon={Icon.Image} />
      <Action.OpenInBrowser title="View on GitHub" url={iconUrl} icon={Icon.Link} />
      <Action
        title="Package Install Command"
        icon={Icon.Link}
        onAction={async () => {
          const packageName = "npm install react-native-coolicons-library";
          await Clipboard.copy(packageName);
          await showHUD("Package install command copied!");
        }}
      />
      <Action title="Open Settings" icon={Icon.Gear} onAction={openCommandPreferences} />
    </ActionPanel>
  );
};

export default IconActionPanel;
