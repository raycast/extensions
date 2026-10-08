import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { getFavicon, showFailureToast, useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { exec } from "child_process";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import { promisify } from "util";
import { expandPath, getLeaderKeyConfig } from "./lib/config";
import { flattenShortcuts } from "./lib/shortcuts";
import type { ShortcutItem } from "./types";

const execAsync = promisify(exec);

function getIcon(shortcut: ShortcutItem) {
  if (shortcut.type === "url") {
    return getFavicon(shortcut.value, { fallback: Icon.Globe });
  }
  return shortcut.type === "application" ? Icon.Finder : Icon.Terminal;
}

async function executeShortcut(shortcut: ShortcutItem) {
  if (shortcut.type === "command") {
    const expandedCommand = expandPath(shortcut.value);
    await execAsync(expandedCommand);
  } else {
    await open(shortcut.value);
  }
}

async function loadShortcuts(): Promise<ShortcutItem[]> {
  const config = getLeaderKeyConfig();
  return config ? flattenShortcuts(config) : [];
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data: shortcuts = [], isLoading } = useCachedPromise(loadShortcuts, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Error loading config" });
    },
  });

  const fuse = useMemo(
    () =>
      new Fuse(shortcuts, {
        keys: [
          { name: "alias", weight: 0.4 },
          { name: "label", weight: 0.3 },
          { name: "value", weight: 0.3 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [shortcuts],
  );

  const filteredShortcuts = useMemo(() => {
    if (!searchText.trim()) return shortcuts;
    return fuse.search(searchText).map((r) => r.item);
  }, [searchText, fuse, shortcuts]);

  const { data: sortedShortcuts, visitItem } = useFrecencySorting(filteredShortcuts, {
    key: (item) => item.alias,
  });

  const handleExecuteShortcut = async (shortcut: ShortcutItem) => {
    try {
      await executeShortcut(shortcut);
      visitItem(shortcut);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to execute shortcut" });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search shortcuts... (${shortcuts.length} total)`}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No shortcuts found"
        description={shortcuts.length === 0 ? "No Leader Key config loaded" : "Try a different search term"}
      />
      {sortedShortcuts.map((shortcut) => (
        <List.Item
          key={shortcut.alias}
          icon={getIcon(shortcut)}
          title={shortcut.alias}
          subtitle={shortcut.label || shortcut.value}
          accessories={[{ text: shortcut.value }]}
          actions={
            <ActionPanel>
              <Action title="Open" icon={Icon.ArrowRight} onAction={() => handleExecuteShortcut(shortcut)} />
              <Action.CopyToClipboard title="Copy Shortcut" content={shortcut.alias} />
              <Action.CopyToClipboard title="Copy Value" content={shortcut.value} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
