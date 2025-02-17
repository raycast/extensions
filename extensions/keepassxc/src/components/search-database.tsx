import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  open,
  showToast,
  showHUD,
  Toast,
} from "@raycast/api";
import { KeePassLoader, showToastCliErrors } from "../utils/keepass-loader";
import { getTOTPCode } from "../utils/totp";

/**
 * Get an array of unique folder names from the given entries.
 *
 * Folders are determined by the first element of each entry.
 * If the first element is empty, it is considered not a folder.
 * The folders are sorted case-insensitively.
 *
 * @param {string[][]} entries - The KeePass database entries.
 * @returns {string[]} - The unique folder names.
 */
function getFolders(entries: string[][]): string[] {
  return Array.from(new Set(entries.map((entry: string[]) => entry[0]).filter((v: string) => v !== ""))).sort((a, b) =>
    (a as string).localeCompare(b as string)
  );
}

/**
 * A dropdown component to filter by folder.
 *
 * @param {Object} props - The component props.
 * @param {string[]} props.folders - The list of unique folder names.
 * @param {(newValue: string) => void} props.onFolderChange - The function to be called when the selected folder changes.
 *
 * @returns {JSX.Element} The dropdown component.
 */
function FolderFilterDropdown(props: { folders: string[]; onFolderChange: (newValue: string) => void }) {
  const { folders, onFolderChange } = props;
  return (
    <List.Dropdown
      tooltip="Filter by Folder"
      defaultValue={""}
      onChange={(newValue) => {
        onFolderChange(newValue);
      }}
    >
      <List.Dropdown.Item title="All" key="-1" value="" />
      <List.Dropdown.Section title="Folder">
        {folders.map((folder, index) => (
          <List.Dropdown.Item key={index.toString()} title={folder} value={folder} icon={Icon.Folder} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

/**
 * Component for searching and displaying KeePass database entries.
 *
 * @param {Object} props - The component props.
 * @param {(isUnlocked: boolean) => void} props.setIsUnlocked - A function to update the lock status of the database.
 *
 * @returns {JSX.Element} The search interface for KeePass database entries.
 *
 * This component loads entries from the cache and updates them by refreshing the cache.
 * It displays the entries in a searchable list format. Users can perform actions such as
 * pasting or copying passwords, usernames, and TOTP, as well as opening URLs associated
 * with entries. If an error occurs, the database is locked, and an error message is shown.
 */
export default function SearchDatabase({ setIsUnlocked }: { setIsUnlocked: (isUnlocked: boolean) => void }) {
  const [entries, setEntries] = useState<string[][]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [entriesFolder, setEntriesFolder] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const errorHandler = (e: { message: string }) => {
    setIsUnlocked(false);
    showToastCliErrors(e);
  };

  useEffect(() => {
    KeePassLoader.loadEntriesCache()
      .then((entries) => {
        setEntries(entries);
        setFolders(getFolders(entries));
      })
      .then(KeePassLoader.refreshEntriesCache)
      .then((entries) => {
        setIsLoading(false);
        setEntries(entries);
        setFolders(getFolders(entries));
      }, errorHandler);
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in KeePassXC"
      searchBarAccessory={
        folders.length > 0 ? <FolderFilterDropdown folders={folders} onFolderChange={setEntriesFolder} /> : undefined
      }
      throttle={true}
    >
      {entries.map(
        (entry, i) =>
          entry[0].startsWith(entriesFolder) &&
          entry[1] !== "" && (
            <List.Item
              key={i}
              title={entry[1]}
              subtitle={{ value: entry[2], tooltip: "Username" }}
              accessories={[
                entry[0] !== ""
                  ? { tag: { value: entry[0], color: Color.SecondaryText }, icon: Icon.Folder, tooltip: "Folder" }
                  : {},
                {
                  icon: { source: Icon.Clock, tintColor: entry[6] !== "" ? Color.Green : Color.SecondaryText },
                  tooltip: entry[6] !== "" ? "TOTP Set" : "TOTP Unset",
                },
                {
                  icon: { source: Icon.Key, tintColor: entry[3] !== "" ? Color.Green : Color.SecondaryText },
                  tooltip: entry[3] !== "" ? "Password Set" : "Password Unset",
                },
                {
                  icon: { source: Icon.Link, tintColor: entry[4] !== "" ? Color.Green : Color.SecondaryText },
                  tooltip: entry[4] !== "" ? "URL Set" : "URL Unset",
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Paste">
                    <Action
                      title="Paste Password"
                      icon={Icon.BlankDocument}
                      onAction={() => {
                        entry[3] !== ""
                          ? Clipboard.paste(entry[3]).then(() => closeMainWindow())
                          : showToast(Toast.Style.Failure, "Error", "No Password Set");
                      }}
                    />
                    <Action
                      title="Paste Username"
                      icon={Icon.BlankDocument}
                      shortcut={{ modifiers: ["shift"], key: "enter" }}
                      onAction={() => {
                        entry[2] !== ""
                          ? Clipboard.paste(entry[2]).then(() => closeMainWindow())
                          : showToast(Toast.Style.Failure, "Error", "No Username Set");
                      }}
                    />
                    <Action
                      title="Paste TOTP"
                      icon={Icon.BlankDocument}
                      shortcut={{ modifiers: ["opt"], key: "enter" }}
                      onAction={() => {
                        if (entry[6] !== "") {
                          try {
                            Clipboard.paste(getTOTPCode(entry[6])).then(() => closeMainWindow());
                          } catch {
                            showToast(Toast.Style.Failure, "Error", "Invalid TOTP URL");
                          }
                        } else {
                          showToast(Toast.Style.Failure, "Error", "No TOTP Set");
                        }
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action
                      title="Copy Password"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "g" }}
                      onAction={() => {
                        if (entry[3] !== "") {
                          Clipboard.copy(entry[3], { concealed: true });
                          showHUD("Password has been copied to clipboard");
                        } else showToast(Toast.Style.Failure, "Error", "No Password Set");
                      }}
                    />
                    <Action
                      title="Copy Username"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      onAction={() => {
                        if (entry[2] !== "") {
                          Clipboard.copy(entry[2]);
                          showHUD("Username has been copied to clipboard");
                        } else showToast(Toast.Style.Failure, "Error", "No Username Set");
                      }}
                    />
                    <Action
                      title="Copy TOTP"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => {
                        if (entry[6] !== "") {
                          try {
                            Clipboard.copy(getTOTPCode(entry[6]), { concealed: true });
                            showHUD("TOTP has been copied to clipboard");
                          } catch {
                            showToast(Toast.Style.Failure, "Error", "Invalid TOTP URL");
                          }
                        } else showToast(Toast.Style.Failure, "Error", "No TOTP Set");
                      }}
                    />
                  </ActionPanel.Section>
                  <Action
                    title="Open URL"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "u" }}
                    onAction={() => {
                      entry[4] !== "" ? open(entry[4]) : showToast(Toast.Style.Failure, "Error", "No URL Set");
                    }}
                  />
                </ActionPanel>
              }
            />
          )
      )}
      <List.EmptyView
        title="No Entries Found"
        description={entries.length === 0 ? "Your database seems empty" : "Try adjusting your search"}
      />
    </List>
  );
}
