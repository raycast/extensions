import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  Clipboard,
  popToRoot,
  closeMainWindow,
  useNavigation,
} from "@raycast/api";
import { exec } from "child_process";
import { usePersistentState } from "raycast-toolkit";
import { shellEnv } from "shell-env";

interface RbwEntry {
  id: string;
  name: string;
}

const rbw_path: string = "/opt/homebrew/bin/rbw";

const getShellEnv = async () => {
  const env = await shellEnv();
  return env;
};

const runRbwCommand = async (command: string): Promise<string> => {
  try {
    const env = await getShellEnv();
    return new Promise((resolve, reject) => {
      exec(
        `${env.SHELL || "/bin/sh"} -c '${command}'`,
        { env },
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Command Error: ${stderr || error.message}`);
            reject(stderr || error.message);
          } else {
            resolve(stdout);
          }
        },
      );
    });
  } catch (error) {
    throw new Error(
      `Error getting shell environment: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const fetchEntries = async (): Promise<RbwEntry[]> => {
  try {
    const output = await runRbwCommand(`${rbw_path} list`);

    const entries = output
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "");

    if (entries.length === 0) {
      throw new Error("No entries found or output is empty.");
    }

    return entries.map((entry, index) => ({
      id: `id-${index}`,
      name: entry.trim(),
    }));
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error fetching entries",
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

const getPassword = async (
  entryName: string,
  username?: string,
): Promise<string | null> => {
  try {
    const sanitizedEntryName = entryName
      .replace(/\(/g, "")
      .replace(/\)/g, "")
      .trim();
    const sanitizedUsername = username ? username.trim() : "";

    const command = username
      ? `${rbw_path} get '${sanitizedEntryName}' '${sanitizedUsername}'` // eslint-disable-line quotes
      : `${rbw_path} get '${sanitizedEntryName}'`; // eslint-disable-line quotes

    const output = await runRbwCommand(command);

    return output || null;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error fetching password",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const getTotp = async (
  entryName: string,
  username?: string,
): Promise<string | null> => {
  try {
    const sanitizedEntryName = entryName
      .replace(/\(/g, "")
      .replace(/\)/g, "")
      .trim();
    const sanitizedUsername = username ? username.trim() : "";

    const command = username
      ? `${rbw_path} code '${sanitizedEntryName}' '${sanitizedUsername}'` // eslint-disable-line quotes
      : `${rbw_path} code '${sanitizedEntryName}'`; // eslint-disable-line quotes

    const output = await runRbwCommand(command);

    return output || null;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error fetching totp",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

// New component to handle the list of multiple matching entries
const SelectEntryList = ({
  entries,
  onSelect,
}: {
  entries: RbwEntry[];
  onSelect: (entry: RbwEntry) => void;
}) => {
  return (
    <List
      navigationTitle="Select Entry"
      searchBarPlaceholder="Search for an entry..."
      onSearchTextChange={(searchText) =>
        setFilteredEntries(
          entries.filter((entry) =>
            entry.name.toLowerCase().includes(searchText.toLowerCase()),
          ),
        )
      }
    >
      {entries.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.name}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                icon={Icon.Checkmark}
                onAction={() => onSelect(entry)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

const Command = () => {
  const [entries, setEntries] = useState<RbwEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<RbwEntry[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [recentlyUsed, setRecentlyUsed] = usePersistentState<RbwEntry[]>( // eslint-disable-line @typescript-eslint/no-unused-vars
    "recently-used",
    [],
  );
  const { push } = useNavigation();

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const entries = await fetchEntries();
        setEntries(entries);
        setFilteredEntries(entries);
      } catch (error) {
        console.error("Error loading entries:", error);
      }
    };
    loadEntries();
  }, []);

  useEffect(() => {
    setFilteredEntries(
      entries.filter((entry) =>
        (entry.name || "").toLowerCase().includes(searchText.toLowerCase()),
      ),
    );
  }, [searchText, entries]);

  const addToRecentlyUsed = (entry: RbwEntry) => {
    setRecentlyUsed((list) =>
      list.find((x) => x.id === entry.id)
        ? list
        : [entry, ...list].slice(0, 10),
    );
  };

  const handleCopyPassword = async (entry: RbwEntry) => {
    const entryName = entry.name;

    // Search for exact matches
    const matchingEntries = entries.filter((e) => e.name === entryName);

    if (matchingEntries.length === 1) {
      const password = await getPassword(entryName);
      if (password) {
        await Clipboard.copy(password); // Use Raycast's Clipboard API to copy password
        showToast({
          style: Toast.Style.Success,
          title: "Password copied to clipboard",
        });
        // Optionally close the Raycast window after copying
        await popToRoot();
        await closeMainWindow();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Password not found",
        });
      }
      addToRecentlyUsed(entry);
    } else if (matchingEntries.length > 1) {
      push(
        <SelectEntryList
          entries={matchingEntries}
          onSelect={async (selectedEntry) => {
            const password = await getPassword(entryName, selectedEntry.id);
            if (password) {
              await Clipboard.copy(password); // Use Raycast's Clipboard API to copy password
              showToast({
                style: Toast.Style.Success,
                title: "Password copied to clipboard",
              });
              // Optionally close the Raycast window after copying
              await popToRoot();
              await closeMainWindow();
            } else {
              showToast({
                style: Toast.Style.Failure,
                title: "Password not found",
              });
            }
            addToRecentlyUsed(entry);
          }}
        />,
      );
    }
  };

  const handleCopyTotp = async (entry: RbwEntry) => {
    const entryName = entry.name;

    // Search for exact matches
    const matchingEntries = entries.filter((e) => e.name === entryName);

    if (matchingEntries.length === 1) {
      const password = await getTotp(entryName);
      if (password) {
        await Clipboard.copy(password); // Use Raycast's Clipboard API to copy password
        showToast({
          style: Toast.Style.Success,
          title: "TOTP copied to clipboard",
        });
        // Optionally close the Raycast window after copying
        await popToRoot();
        await closeMainWindow();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "TOPT not found",
        });
      }
      addToRecentlyUsed(entry);
    } else if (matchingEntries.length > 1) {
      push(
        <SelectEntryList
          entries={matchingEntries}
          onSelect={async (selectedEntry) => {
            const password = await getTotp(entryName, selectedEntry.id);
            if (password) {
              await Clipboard.copy(password); // Use Raycast's Clipboard API to copy password
              showToast({
                style: Toast.Style.Success,
                title: "TOTP copied to clipboard",
              });
              // Optionally close the Raycast window after copying
              await popToRoot();
              await closeMainWindow();
            } else {
              showToast({
                style: Toast.Style.Failure,
                title: "TOTP not found",
              });
            }
            addToRecentlyUsed(entry);
          }}
        />,
      );
    }
  };

  return (
    <List
      isLoading={entries.length === 0}
      searchBarPlaceholder="Search entries..."
      onSearchTextChange={setSearchText}
      navigationTitle="RBW Entries"
    >
      {filteredEntries.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.name}
          actions={
            <ActionPanel>
              <Action
                title="Copy Password"
                icon={Icon.Clipboard}
                onAction={() => handleCopyPassword(entry)}
              />
              <Action
                title="Copy Totp"
                icon={Icon.Clipboard}
                onAction={() => handleCopyTotp(entry)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default Command;
