import { List, ActionPanel, Action } from "@raycast/api";

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    action: string;
    shortcut: string;
    description: string;
  }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Search & Navigation",
    shortcuts: [
      {
        action: "Search",
        shortcut: "Type to search",
        description: "Search by company name or organization number",
      },
      {
        action: "View Details",
        shortcut: "Enter",
        description: "View detailed company information",
      },
      {
        action: "Open in Browser",
        shortcut: "⌘⇧↵",
        description: "Open company in Brønnøysundregistrene",
      },
    ],
  },
  {
    title: "Favorites Management",
    shortcuts: [
      {
        action: "Add to Favorites",
        shortcut: "⌘F",
        description: "Add company to favorites",
      },
      {
        action: "Remove from Favorites",
        shortcut: "⌘⇧F",
        description: "Remove company from favorites",
      },
      {
        action: "Toggle Move Mode",
        shortcut: "⌘⇧M",
        description: "Enable/disable favorites reordering",
      },
    ],
  },
  {
    title: "Favorites Reordering",
    shortcuts: [
      {
        action: "Move Up",
        shortcut: "⌘⇧↑",
        description: "Move favorite up in the list",
      },
      {
        action: "Move Down",
        shortcut: "⌘⇧↓",
        description: "Move favorite down in the list",
      },
    ],
  },
  {
    title: "Copy Actions",
    shortcuts: [
      {
        action: "Copy Organization Number",
        shortcut: "⌘O",
        description: "Copy organization number to clipboard",
      },
      {
        action: "Copy Address",
        shortcut: "No shortcut",
        description: "Copy business address to clipboard",
      },
    ],
  },
  {
    title: "Emoji Management",
    shortcuts: [
      {
        action: "Set Emoji",
        shortcut: "No shortcut",
        description: "Set custom emoji for company",
      },
      {
        action: "Reset to Favicon",
        shortcut: "No shortcut",
        description: "Reset to default favicon",
      },
      {
        action: "Refresh Favicon",
        shortcut: "No shortcut",
        description: "Refresh company favicon",
      },
    ],
  },
];

export default function KeyboardShortcutsHelp() {
  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Back" onAction={() => {}} />
        </ActionPanel>
      }
    >
      {SHORTCUT_GROUPS.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.shortcuts.map((shortcut) => (
            <List.Item
              key={shortcut.action}
              title={shortcut.action}
              subtitle={shortcut.description}
              accessories={[{ text: shortcut.shortcut }]}
              icon="⌨️"
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
