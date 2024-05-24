import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { getFormattedColor } from "../utils";
import { HistoryColor } from "../types";

type CopyAsSubmenuProps = {
  color: HistoryColor;
  onCopy?: () => void;
};

export default function CopyAsSubmenu({ color, onCopy }: CopyAsSubmenuProps) {
  return (
    <ActionPanel.Submenu title="Copy As" icon={Icon.Clipboard} shortcut={Keyboard.Shortcut.Common.Copy}>
      <Action.CopyToClipboard title={`HEX`} content={getFormattedColor(color, "hex")} onCopy={onCopy} />
      <Action.CopyToClipboard
        title={`Lowercased HEX`}
        content={getFormattedColor(color, "hex-lower-case")}
        onCopy={onCopy}
      />
      <Action.CopyToClipboard
        title={`HEX Without #`}
        content={getFormattedColor(color, "hex-no-prefix")}
        onCopy={onCopy}
      />
      <Action.CopyToClipboard title={`RGB`} content={getFormattedColor(color, "rgba")} onCopy={onCopy} />
      <Action.CopyToClipboard
        title={`RGB Percentage`}
        content={getFormattedColor(color, "rgba-percentage")}
        onCopy={onCopy}
      />
      <Action.CopyToClipboard title={`HSL`} content={getFormattedColor(color, "hsla")} onCopy={onCopy} />
      <Action.CopyToClipboard title={`HSV`} content={getFormattedColor(color, "hsva")} onCopy={onCopy} />
    </ActionPanel.Submenu>
  );
}
