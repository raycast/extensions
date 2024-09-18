import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, open } from "@raycast/api";
import {
  loadEntriesCache,
  refreshEntriesCache,
  pastePassword,
  pasteUsername,
  pasteTOTP,
  copyPassword,
  copyUsername,
  copyTOTP,
  getURL,
} from "./utils/keepassLoader";
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
    loadEntriesCache()
      .then((entries) => {
        console.log("loading entries");
        setEntries(entries);
      })
      .catch(errorHandler)
      .then(refreshEntriesCache)
      .then((entries) => {
        console.log("updating entries");
        setIsLoading(false);
        setEntries(entries);
      });
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Type to Search in KeepassXC" throttle={true}>
      {entries?.map((entry, i) => (
        <List.Item
          key={i}
          title={entry.split("/")[entry.split("/").length - 1]}
          accessories={
            entry.split("/").length > 2
              ? entry
                  .split("/")
                  .slice(1, entry.split("/").length - 1)
                  .map((tag) => {
                    return { tag: tag };
                  })
              : []
          }
          keywords={entry.split("/").slice(1)}
          actions={
            <ActionPanel>
              <Action
                title="Paste Password"
                icon={Icon.BlankDocument}
                onAction={() => {
                  pastePassword(entry)
                    .then(() => closeMainWindow())
                    .catch(errorHandler);
                }}
              />
              <Action
                title="Paste Username"
                icon={Icon.BlankDocument}
                shortcut={{ modifiers: ["shift"], key: "enter" }}
                onAction={() => {
                  pasteUsername(entry)
                    .then(() => closeMainWindow())
                    .catch(errorHandler);
                }}
              />
              <Action
                title="Paste TOTP"
                icon={Icon.BlankDocument}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
                onAction={() => {
                  pasteTOTP(entry)
                    .then(() => closeMainWindow())
                    .catch(errorHandler);
                }}
              />
              <Action
                title="Copy Password"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                onAction={() => {
                  copyPassword(entry)
                    .then(() => closeMainWindow())
                    .catch(errorHandler);
                }}
              />
              <Action
                title="Copy Username"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                onAction={() => {
                  copyUsername(entry)
                    .then(() => closeMainWindow())
                    .catch(errorHandler);
                }}
              />
              <Action
                title="Copy TOTP"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => {
                  copyTOTP(entry)
                    .then(() => closeMainWindow())
                    .catch(errorHandler);
                }}
              />
              <Action
                title="Open URL"
                icon={Icon.Link}
                shortcut={{ modifiers: ["shift", "cmd"], key: "u" }}
                onAction={() => {
                  getURL(entry)
                    .then((url) => {
                      if (url != "" && url != undefined) {
                        open(url);
                      } else {
                        showToast(Toast.Style.Failure, "URL Not Set");
                      }
                    })
                    .catch(errorHandler);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
