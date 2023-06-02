import * as React from "react";
import { List, Action, ActionPanel } from "@raycast/api";

const convertToTailwind = (pixels: number): string => String((pixels / 16) * 4);
const convertToPixels = (twValue: number) => (twValue / 4) * 16 + "px";

export default function Command() {
  const [px, setPx] = React.useState<string>(16 + "px");
  const [tw, setTw] = React.useState<string>(convertToTailwind(16));

  const handleOnTextChange = (value = "") => {
    const input = Number(value.trim().split(" ")[0]);
    if (!isNaN(input)) {
      setTw(convertToTailwind(input));
      setPx(convertToPixels(input));
    }
  };

  return (
    <List
      onSearchTextChange={handleOnTextChange}
      navigationTitle="Pixels to Tailwind"
      searchBarPlaceholder="Search your Pixels"
    >
      <List.Section title="Tailwind units">
        <List.Item
          title={tw}
          actions={
            <ActionPanel title="Copy">
              <Action.CopyToClipboard title="Copy To Clipboard" content={tw} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="In pixels">
        <List.Item
          title={px}
          actions={
            <ActionPanel title="Copy">
              <Action.CopyToClipboard title="Copy To Clipboard" content={px} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
