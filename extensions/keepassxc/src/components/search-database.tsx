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
  const [isLoading, setIsLoading] = useState(true);

  const errorHandler = (e: { message: string }) => {
    setIsUnlocked(false);
    showToastCliErrors(e);
  };

  useEffect(() => {
    KeePassLoader.loadEntriesCache()
      .then((entries) => {
        setEntries(entries);
      })
      .then(KeePassLoader.refreshEntriesCache)
      .catch(errorHandler)
      .then((entries) => {
        setIsLoading(false);
        setEntries(entries);
      });
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search in KeePassXC" throttle={true}>
      {entries.map(
        (entry, i) =>
          entry[1] !== "" && (
            <List.Item
              key={i}
              title={entry[1]}
              accessories={[
                entry[6] !== ""
                  ? { icon: { source: Icon.Clock, tintColor: Color.Green }, tooltip: "TOTP Available" }
                  : {},
                entry[2] !== ""
                  ? {
                      text: { value: entry[2], color: Color.SecondaryText },
                      tooltip: "Username",
                      icon: { source: Icon.Person, tintColor: Color.SecondaryText },
                    }
                  : {},
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
                        entry[6] !== ""
                          ? KeePassLoader.pasteTOTP(entry[1]).catch(errorHandler)
                          : showToast(Toast.Style.Failure, "Error", "No TOTP Set");
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
                          showHUD("Password has been copied to clipboard");
                          Clipboard.copy(entry[3], { concealed: true });
                        } else showToast(Toast.Style.Failure, "Error", "No Password Set");
                      }}
                    />
                    <Action
                      title="Copy Username"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      onAction={() => {
                        if (entry[2] !== "") {
                          showHUD("Username has been copied to clipboard");
                          Clipboard.copy(entry[2]);
                        } else showToast(Toast.Style.Failure, "Error", "No Username Set");
                      }}
                    />
                    <Action
                      title="Copy TOTP"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => {
                        if (entry[6] !== "") {
                          KeePassLoader.copyTOTP(entry[1]).catch(errorHandler);
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
