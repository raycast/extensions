import * as React from "react";
import { List, Action, ActionPanel } from "@raycast/api";

const convertToTailwind = (pixels: number): string => String((pixels / 16) * 4);
const convertToPixels = (twValue: number) => (twValue / 4) * 16 + "px";

export default function Command() {
  const [px, setPx] = React.useState<string>(16 + "px");
  const [tw, setTw] = React.useState<string>(convertToTailwind(16));
  const [currentInput, setCurrentInput] = React.useState<string>("");

  const handleOnTextChange = (value = "") => {
    const input = Number(value.trim().split(" ")[0]);
    if (!isNaN(input)) {
      setTw(convertToTailwind(input));
      setPx(convertToPixels(input));
      setCurrentInput(value);
    }
  };

  return (
    <List onSearchTextChange={handleOnTextChange} searchBarPlaceholder="Convert Pixels or Tailwind units">
      <List.EmptyView title="Enter a numbers to convert" icon="noview.png" />
      {currentInput !== "" && (
        <>
          <List.Section title={"Tailwind units"}>
            <List.Item
              title={`${currentInput}px is --tw-${tw}`}
              actions={
                <ActionPanel title="Copy">
                  <Action.CopyToClipboard content={tw} />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title={"Pixels"}>
            <List.Item
              title={`--tw-${currentInput} is ${px}`}
              actions={
                <ActionPanel title="Copy">
                  <Action.CopyToClipboard content={px} />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
    </List>
  );
}
