import { List, ListItem, ActionPanel, Action, Color, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";

// Path to the custom icon
const skhdIcon = "skhd.png";

// Utility function to load keyboard shortcuts from skhdrc
function loadShortcuts(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    exec("cat ~/.config/skhd/skhdrc", (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.split("\n").filter((line) => line && !line.startsWith("#")));
      }
    });
  });
}

// Define the type for the modifier keys
type ModifierKey = "cmd" | "ctrl" | "alt" | "shift";

// Utility function to render modifier keys with icons
function renderModifiers(shortcut: string): string {
  return shortcut.replace(/(?<!\w)(r)?(cmd|ctrl|alt|shift)/gi, (match, r, key) => {
    const keyLower = key.toLowerCase() as ModifierKey;
    const icon = {
      cmd: "⌘",
      ctrl: "⌃",
      alt: "⌥",
      shift: "⇧"
    }[keyLower];
    return icon ? (r ? `r${icon}` : icon) : match;
  });
}

// Function to format and colorize commands based on keywords
function getFormattedCommand(command: string) {
  const commandParts = command.split(" ");
  return commandParts.map((part, index) => {
    if (part.toLowerCase().includes("yabai")) {
      return { text: part, color: Color.Orange };
    } else if (["window", "display"].includes(part.toLowerCase())) {
      return { text: part, color: Color.Blue };
    } else if (["focus", "swap"].includes(part.toLowerCase())) {
      return { text: part, color: Color.Green };
    } else {
      return { text: part };
    }
  });
}

export default function Command() {
  const [shortcuts, setShortcuts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShortcuts()
      .then(setShortcuts)
      .catch(() => {
        // Handle errors silently or with appropriate feedback
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search shortcuts...">
      {shortcuts.map((shortcut, index) => {
        const [keys, command] = shortcut.split("->").map((part) => part?.trim());
        return (
          <ListItem
            key={index}
            title={renderModifiers(keys || "")}
            subtitle={command ? command : ""}
            accessories={getFormattedCommand(command || "")}
            actions={
              <ActionPanel>
                <Action.Open title="Open skhdrc" target="~/.config/skhd/skhdrc" />
              </ActionPanel>
            }
            icon={skhdIcon} // Use custom icon
          />
        );
      })}
    </List>
  );
}
