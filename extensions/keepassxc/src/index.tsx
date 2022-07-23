import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast } from "@raycast/api";
import { loadEntries, pastePassword, copyPassword, copyUsername } from "./utils/keepassLoader";
import { useState, useEffect } from "react";

const errorHandler = (e: { message: string }) => {
  console.error(e);
  let invalidPreference = "";
  if (e.message.includes("Invalid credentials were provided")) {
    invalidPreference = "Password";
  } else if (e.message.includes("keepassxc-cli: No such file or directory") || e.message.includes("ENOENT")) {
    invalidPreference = "Path of KeepassXC.app";
  } else if (
    e.message.includes("Failed to open database file") ||
    e.message.includes("Error while reading the database: Not a KeePass database")
  ) {
    invalidPreference = "Keepass Database File";
  } 
  let toastTitle = "Error";
  let toastMessage = e.message.trim();
  if (invalidPreference !== "") {
    toastTitle = `Invalid Preference: ${invalidPreference}`;
    toastMessage = "Please Check Extension Preference.";
  }
  showToast(Toast.Style.Failure, toastTitle, toastMessage);
};

export default function Command() {
  const [entries, setEntries] = useState<string[]>();
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    loadEntries()
      .then(setEntries)
      .catch(errorHandler)
      .then(() => {
        setIsLoading(false);
      });
  }, []);
  useEffect(() => {
    console.debug(entries);
  }, [entries]);
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
              <Action
                title="Paste"
                icon={Icon.BlankDocument}
                onAction={() => {
                  pastePassword(entry).then(() => closeMainWindow());
                }}
              />
              <Action
                title="Copy Password"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
                onAction={() => {
                  copyPassword(entry).then(() => closeMainWindow());
                }}
              />
              <Action
                title="Copy Username"
                icon={Icon.Clipboard}
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
