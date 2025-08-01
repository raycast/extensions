import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { HistoryColor } from "../types";
import { getFormattedColor } from "../utils";

type CopyAsSubmenuProps = {
  color: HistoryColor;
  onCopy?: () => void;
};

export default function CopyAsSubmenu({ color, onCopy }: CopyAsSubmenuProps) {
  return (
    <ActionPanel.Submenu title="Copy as" icon={Icon.Clipboard} shortcut={Keyboard.Shortcut.Common.Copy}>
      <Action.CopyToClipboard title="Hex" content={getFormattedColor(color, "hex")} onCopy={onCopy} />
      <Action.CopyToClipboard
        title="Lowercased Hex"
        content={getFormattedColor(color, "hex-lower-case")}
        onCopy={onCopy}
      />
      <Action.CopyToClipboard
        title="Hex Without #"
        content={getFormattedColor(color, "hex-no-prefix")}
        onCopy={onCopy}
      />
      <Action.CopyToClipboard title="Rgb" content={getFormattedColor(color, "rgb")} onCopy={onCopy} />
      <Action.CopyToClipboard
        title="Rgb Percentage"
        content={getFormattedColor(color, "rgb-percentage")}
        onCopy={onCopy}
      />
      <Action.CopyToClipboard title="Rgba" content={getFormattedColor(color, "rgba")} onCopy={onCopy} />
      <Action.CopyToClipboard
        title="Rgba Percentage"
        content={getFormattedColor(color, "rgba-percentage")}
        onCopy={onCopy}
      />
      <Action.CopyToClipboard title="Hsl" content={getFormattedColor(color, "hsla")} onCopy={onCopy} />
      <Action.CopyToClipboard title="Hsv" content={getFormattedColor(color, "hsva")} onCopy={onCopy} />
      <Action.CopyToClipboard title="Oklch" content={getFormattedColor(color, "oklch")} onCopy={onCopy} />
      <Action.CopyToClipboard title="Lch" content={getFormattedColor(color, "lch")} onCopy={onCopy} />
      <Action.CopyToClipboard title="P3" content={getFormattedColor(color, "p3")} onCopy={onCopy} />
    </ActionPanel.Submenu>
  );
}
