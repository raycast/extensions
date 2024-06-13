import * as React from "react";
import { List, Action, ActionPanel } from "@raycast/api";
import { findNearestTwValue, findOldValue, Result } from "./utils";

const convertToPixels = (twValue: number) => (twValue / 4) * 16 + "px";

export default function Command() {
  const [px, setPx] = React.useState<string>(16 + "px");
  const [tw, setTw] = React.useState<Result>();
  const [currentInput, setCurrentInput] = React.useState<string>("");

  const handleNumber = (newValue: number) => {
    setTw(findNearestTwValue(newValue));
    setPx(convertToPixels(newValue));
    setCurrentInput(newValue.toString());
  };

  const handleString = (newValue: string) => {
    // Here we attempt to match an old value
    const oldValue = findOldValue(newValue);
    if (oldValue) {
      setTw(oldValue);
      setPx("");
      setCurrentInput(newValue);
      return;
    }
    handleEmpty();
  };

  const handleEmpty = () => {
    setTw(undefined);
    setPx("");
    setCurrentInput("");
  };

  const handleOnTextChange = (value = "") => {
    const input = value.trim().split(" ")[0];
    if (input) {
      const inputNumber = Number(input);
      if (!isNaN(inputNumber)) {
        return handleNumber(inputNumber);
      }
      return handleString(input);
    }

    handleEmpty();
  };

  const getLabel = () => {
    if (!currentInput) return "";
    if (tw?.isExact)
      return `Exactly ${tw.value?.label} (${tw?.value?.width}, ${tw?.value?.px}px)`;
    return `Closest match is ${tw?.value?.label} (${tw?.value?.width}, ${tw?.value?.px}px)`;
  };

  return (
    <List
      onSearchTextChange={handleOnTextChange}
      navigationTitle="Pixels <–> Tailwind"
      searchBarPlaceholder="Convert Pixels or Tailwind units"
    >
      {currentInput ? (
        <>
          <List.Section title={"Tailwind units"}>
            <List.Item
              title={getLabel()}
              actions={
                <ActionPanel title="Copy">
                  <Action.CopyToClipboard
                    title="Copy To Clipboard"
                    content={tw?.value?.label || ""}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          {px ? (
            <List.Section title={"Pixels"}>
              <List.Item
                title={`--tw-${currentInput} is ${px}`}
                actions={
                  <ActionPanel title="Copy">
                    <Action.CopyToClipboard
                      title="Copy To Clipboard"
                      content={px}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : null}
        </>
      ) : null}
    </List>
  );
}
