import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { COLOURS } from "./data/colours";

export default function DiscordColors() {
  return (
    <List searchBarPlaceholder="Search Discord colours — blurple, dark theme…">
      {COLOURS.map((colour) => {
        const literal = colour.hex.replace("#", "0x");
        const decimal = parseInt(colour.hex.slice(1), 16);
        return (
          <List.Item
            key={colour.name}
            icon={{ source: Icon.CircleFilled, tintColor: colour.hex }}
            title={colour.title}
            subtitle={colour.hex}
            accessories={[{ text: String(decimal) }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Java Colour"
                  content={`new Color(${literal})`}
                />
                <Action.CopyToClipboard
                  title="Copy Embed Call"
                  content={`.setColor(${literal})`}
                />
                <Action.CopyToClipboard title="Copy Hex" content={colour.hex} />
                <Action.CopyToClipboard
                  title="Copy Integer"
                  content={String(decimal)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
