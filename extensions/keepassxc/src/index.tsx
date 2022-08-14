import { ActionPanel, closeMainWindow, Icon, List, showToast, showHUD, ToastStyle, clearClipboard } from "@raycast/api";
import { loadEntries, copyAndPastePassword, copyPassword, copyUsername, copyOTP } from "./utils/keepassLoader";
import { runAppleScript, runAppleScriptSync } from "run-applescript";
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
              <ActionPanel.Item
                title="Copy OTP"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["control", "cmd"], key: "c" }}
                onAction={() => {
                  // copyOTP(entry).then(() => closeMainWindow());
                  copyOTP(entry).then(() => closeMainWindow());
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export async function protectedCopy(concealString: string) {
  // await closeMainWindow();
  const script = `
    use framework "Foundation"
    set type to current application's NSPasteboardTypeString
	  set pb to current application's NSPasteboard's generalPasteboard()
    pb's clearContents()
	  pb's setString:"" forType:"org.nspasteboard.ConcealedType"
    pb's setString:"${concealString}" forType:type
  `
  try {
    await runAppleScript(script);
  } catch {
    // Applescript failed to conceal what is being placed in the pasteboard
    await showHUD("Protect copy failed...");
  }
}
