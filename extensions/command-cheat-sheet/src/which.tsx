import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";

import gitShortcuts from "../shortcuts/git.json";
import nvimShortcuts from "../shortcuts/nvim.json";

interface Shortcut {
  tool: "git" | "nvim";
  keys: string;
  description: string;
}

// Shape of the JSON entries in shortcuts/*.json
interface ShortcutJsonEntry {
  keys: string;
  description: string;
}

// Keep helpers outside of React hooks/components to satisfy many ESLint rules
function fuzzyMatch(text: string, pattern: string): boolean {
  let patternIdx = 0;

  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      patternIdx++;
    }
  }

  return patternIdx === pattern.length;
}

function loadShortcuts(): Shortcut[] {
  const allShortcuts: Shortcut[] = [];

  (gitShortcuts as ShortcutJsonEntry[]).forEach((shortcut) => {
    allShortcuts.push({
      tool: "git",
      keys: shortcut.keys,
      description: shortcut.description,
    });
  });

  (nvimShortcuts as ShortcutJsonEntry[]).forEach((shortcut) => {
    allShortcuts.push({
      tool: "nvim",
      keys: shortcut.keys,
      description: shortcut.description,
    });
  });

  return allShortcuts;
}

// Prefer a stable key over array index
function shortcutKey(s: Shortcut): string {
  return `${s.tool}:${s.keys}:${s.description}`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const shortcuts = useMemo(() => loadShortcuts(), []);

  const filteredShortcuts = useMemo(() => {
    if (!searchText) return shortcuts;

    const query = searchText.toLowerCase();

    const queryParts = query.split(/\s+/).filter((part) => part.length > 0);

    return shortcuts.filter((shortcut) => {
      const combinedText = `${shortcut.tool} ${shortcut.keys} ${shortcut.description}`.toLowerCase();
      return queryParts.every((part) => fuzzyMatch(combinedText, part));
    });
  }, [searchText, shortcuts]);

  return (
    <List
      searchBarPlaceholder="Search shortcuts by keys or description..."
      onSearchTextChange={setSearchText}
      isLoading={shortcuts.length === 0}
    >
      {filteredShortcuts.map((shortcut) => (
        <List.Item
          key={shortcutKey(shortcut)}
          icon={Icon.Keyboard}
          title={shortcut.keys}
          subtitle={shortcut.description}
          accessories={[{ text: shortcut.tool }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={shortcut.keys} title="Copy Shortcut Keys" />
              <Action.CopyToClipboard content={`${shortcut.keys} - ${shortcut.description}`} title="Copy Full Entry" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
