import { Action, ActionPanel, Clipboard, List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [input, setInput] = useState<string | undefined>(undefined);
  const [clipboardText, setClipboardText] = useState<string | undefined>(undefined);
  const [localDateTime, setLocalDateTime] = useState<string | undefined>(undefined);
  const [utcDateTime, setUtcDateTime] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getClipboardText = async () => {
      const clipboardContents = await Clipboard.readText();
      setClipboardText(clipboardContents);
    };

    getClipboardText();
  }, []);

  useEffect(() => {
    const handleInputChange = async () => {
      try {
        const val = input || clipboardText;

        if (val && !isNaN(parseInt(val))) {
          const date = new Date(parseInt(val));
          const parsedLocalDateTime = date.toString();
          const parsedUtcDateTime = date.toUTCString();
          setLocalDateTime(parsedLocalDateTime);
          setUtcDateTime(parsedUtcDateTime);
        } else {
          await showToast({ title: "Invalid Input", message: "Please insert an epoch date value." });
        }
      } catch (e) {
        await showToast({ title: "Error", message: "Something went wrong." });
      }
    };

    handleInputChange();
  }, [input, clipboardText]);

  const handleSearchChange = async (args: string) => {
    setInput(args);
  };

  return (
    <>
      <List
        filtering={false}
        navigationTitle="Date Submission"
        searchBarPlaceholder="Submit an Epoch Date to Convert"
        onSearchTextChange={handleSearchChange}
      >
        {localDateTime && utcDateTime && (
          <List.Section title={`Input: ${input || clipboardText}`}>
            <List.Item
              title={localDateTime}
              subtitle="Your Timezone"
              actions={
                <ActionPanel title="#1 Your Timezone">
                  <Action.CopyToClipboard title="Copy Your Timezone" content={localDateTime || ""} />
                </ActionPanel>
              }
            />
            <List.Item
              title={utcDateTime}
              subtitle="GMT/UTC Timezone"
              actions={
                <ActionPanel title="#2 GMT/UTC Timezone">
                  <Action.CopyToClipboard title="Copy GMT/UTC Timezone" content={utcDateTime || ""} />
                </ActionPanel>
              }
            />
          </List.Section>
        )}
      </List>
    </>
  );
}
