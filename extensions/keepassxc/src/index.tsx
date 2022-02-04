import { ActionPanel, closeMainWindow, List } from "@raycast/api";
import { loadEntries, copyAndPastePassword, copyPassword, copyUsername } from "./utils/keepassLoader";
import { useState, useEffect } from "react";

export default function Command() {
  const [entries, setEntries] = useState<string[]>();
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    loadEntries()
      .then(setEntries)
      .then(() => setIsLoading(false));
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Type to Search in KeepassXC" throttle={true}>
      {entries?.map((entry, i) => (
        <List.Item
          key={i}
          title={entry.split("/")[entry.split("/").length - 1]}
          accessoryTitle={
            entry.split("/").length > 2
              ? entry
                  .split("/")
                  .slice(1, entry.split("/").length - 1)
                  .join("\t")
              : ""
          }
          keywords={entry.split("/").slice(1)}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Copy and Paste Password"
                onAction={() => {
                  copyAndPastePassword(entry).then(() => closeMainWindow());
                }}
              />
              <ActionPanel.Item
                title="Copy Password"
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
                onAction={() => {
                  copyPassword(entry).then(() => closeMainWindow());
                }}
              />
              <ActionPanel.Item
                title="Copy Username"
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                onAction={() => {
                  copyUsername(entry).then(() => closeMainWindow());
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
