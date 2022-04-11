import { ActionPanel, closeMainWindow, Icon, List, showToast, ToastStyle } from "@raycast/api";
import { loadEntries, copyAndPastePassword, copyPassword, copyUsername } from "./utils/keepassLoader";
import { useState, useEffect } from "react";

const errorHandler = (e: { message: string }) => {
  console.log(e.message);
  console.log(e);
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
  showToast(ToastStyle.Failure, toastTitle, toastMessage);
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
    console.log(entries);
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
              <ActionPanel.Item
                title="Paste"
                icon={Icon.TextDocument}
                onAction={() => {
                  copyAndPastePassword(entry).then(() => closeMainWindow());
                }}
              />
              <ActionPanel.Item
                title="Copy Password"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
                onAction={() => {
                  copyPassword(entry).then(() => closeMainWindow());
                }}
              />
              <ActionPanel.Item
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
