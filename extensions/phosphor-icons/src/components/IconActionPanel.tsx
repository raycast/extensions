import { Action, ActionPanel, Clipboard, showHUD } from "@raycast/api";
import { getIconUrl } from "../utils/helpers";
import fetch from "node-fetch";
import { FC } from "react";

type Props = {
  name: string;
  pascalName: string;
  weight: string;
  weightText: string;
  weightClassName: string;
};

const IconActionPanel: FC<Props> = ({ name, weight, pascalName, weightText, weightClassName }) => {
  return (
    <ActionPanel title="Copy to Clipboard">
      <Action.CopyToClipboard
        title="Copy Name"
        content={name}
        icon={{
          source: getIconUrl("clipboard-text", weight),
          tintColor: { light: "black", dark: "white" },
        }}
      />
      <Action
        title="Copy SVG Code"
        icon={{
          source: getIconUrl("file-svg", weight),
          tintColor: { light: "black", dark: "white" },
        }}
        onAction={async () => {
          const fileContent = await fetch(getIconUrl(name, weight)).then((res) => res.text());
          await Clipboard.copy(fileContent);
          await showHUD("Copied to Clipboard");
        }}
      />
      <Action.CopyToClipboard
        title="Copy HTML"
        content={`<i class="${weightClassName} ph-${name}"></i>`}
        icon={{
          source: getIconUrl("brackets-angle", weight),
          tintColor: { light: "black", dark: "white" },
        }}
      />
      <Action.CopyToClipboard
        title="Copy React"
        content={`<${pascalName} ${weightText} size={32} />`}
        icon={{
          source: getIconUrl("atom", weight),
          tintColor: { light: "black", dark: "white" },
        }}
      />
      <Action.CopyToClipboard
        title="Copy Vue"
        content={`<ph-${name} ${weightText} :size="32" />`}
        icon={{
          source: getIconUrl("file-vue", weight),
          tintColor: { light: "black", dark: "white" },
        }}
      />
    </ActionPanel>
  );
};

export default IconActionPanel;
