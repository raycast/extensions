import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { COLOURS } from "./data/colours";

export default function DiscordColors() {
  return (
    <List searchBarPlaceholder="Search Discord colours — blurple, dark theme…">
      {COLOURS.map((colour) => {
        const decimal = parseInt(colour.hex.slice(1), 16);
        return (
          <List.Item
            key={colour.name}
            icon={{ source: Icon.CircleFilled, tintColor: colour.hex }}
            title={`discord.Colour.${colour.name}()`}
            subtitle={colour.hex}
            accessories={[{ text: String(decimal) }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Python Colour"
                  content={`discord.Colour.${colour.name}()`}
                />
                <Action.CopyToClipboard title="Copy Hex" content={colour.hex} />
                <Action.CopyToClipboard
                  title="Copy Integer"
                  content={String(decimal)}
                />
                <Action.CopyToClipboard
                  title="Copy Colour Literal"
                  content={`discord.Colour(${colour.hex.replace("#", "0x")})`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
