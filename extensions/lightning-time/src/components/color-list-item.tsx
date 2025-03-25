import { Action, ActionPanel, Icon, List } from "@raycast/api";

function ColorListItem({
  colors,
  color,
}: {
  colors: {
    boltColor: string;
    zapColor: string;
    sparkColor: string;
  };
  color: string;
}) {
  const { boltColor, zapColor, sparkColor } = colors;
  return (
    <List.Item
      title=""
      subtitle={`#${color}`}
      icon={{ source: Icon.CircleFilled, tintColor: { light: color, dark: color } }}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Hex Code" content={`#${color}`} />
          <Action.CopyToClipboard title="Copy All Hex Codes" content={`#${boltColor},#${zapColor},#${sparkColor}`} />
        </ActionPanel>
      }
    />
  );
}

export default ColorListItem;
