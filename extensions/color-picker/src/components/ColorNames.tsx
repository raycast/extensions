import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Color } from "color-namer";
import { normalizeColorHex } from "../utils";

export const ColorNameListItem = ({ color }: { color: Color }) => {
  const hexCode = color.hex.replace(/^#/, "");
  return (
    <List.Item
      icon={{
        source: Icon.CircleFilled,
        tintColor: {
          light: hexCode,
          dark: hexCode,
          adjustContrast: false,
        },
      }}
      title={color.name}
      accessories={[
        {
          tag: {
            value: normalizeColorHex(color.hex),
            color: hexCode,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={color.name} title="Copy Name" />
          <Action.CopyToClipboard content={color.hex} title="Copy Hex" />
        </ActionPanel>
      }
    />
  );
};
