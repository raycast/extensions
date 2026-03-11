import { List, ActionPanel, Action, useNavigation } from "@raycast/api";
import { KEYBOARD_SHORTCUTS, formatShortcut } from "../constants";

interface ShortcutEntry {
  action: string;
  shortcutKey?: keyof typeof KEYBOARD_SHORTCUTS;
  shortcutText?: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Search & Navigation",
    shortcuts: [
      {
        action: "Search",
        shortcutText: "Type to search",
        description: "Search by company name or organization number",
      },
      { action: "View Details", shortcutText: "Enter", description: "View detailed company information" },
      {
        action: "Open in Browser",
        shortcutKey: "OPEN_IN_BROWSER",
        description: "Open company in Brønnøysundregistrene",
      },
    ],
  },
  {
    title: "Favorites Management",
    shortcuts: [
      { action: "Add to Favorites", shortcutKey: "ADD_TO_FAVORITES", description: "Add company to favorites" },
      {
        action: "Remove from Favorites",
        shortcutKey: "REMOVE_FROM_FAVORITES",
        description: "Remove company from favorites",
      },
      {
        action: "Toggle Move Mode",
        shortcutKey: "TOGGLE_MOVE_MODE",
        description: "Enable/disable favorites reordering",
      },
    ],
  },
  {
    title: "Favorites Reordering",
    shortcuts: [
      { action: "Move Up", shortcutKey: "MOVE_UP", description: "Move favorite up in the list" },
      { action: "Move Down", shortcutKey: "MOVE_DOWN", description: "Move favorite down in the list" },
    ],
  },
  {
    title: "Copy Actions",
    shortcuts: [
      {
        action: "Copy Organization Number",
        shortcutKey: "COPY_ORG_NUMBER",
        description: "Copy organization number to clipboard",
      },
      {
        action: "Copy Vat Number",
        shortcutKey: "COPY_VAT_NUMBER",
        description: "Copy Norwegian VAT number (NO {orgnr} MVA) to clipboard",
      },
      { action: "Copy Address", shortcutKey: "COPY_ADDRESS", description: "Copy business address to clipboard" },
      { action: "Copy Revenue", shortcutKey: "COPY_REVENUE", description: "Copy revenue to clipboard" },
      { action: "Copy Net Result", shortcutKey: "COPY_NET_RESULT", description: "Copy net result to clipboard" },
    ],
  },
  {
    title: "Tabs",
    shortcuts: [
      { action: "Overview", shortcutKey: "SHOW_OVERVIEW", description: "Switch to Overview tab" },
      { action: "Financials", shortcutKey: "SHOW_FINANCIALS", description: "Switch to Financials tab" },
      { action: "Map", shortcutKey: "SHOW_MAP", description: "Switch to Map tab" },
      { action: "Previous Tab", shortcutKey: "PREVIOUS_TAB", description: "Go to previous tab" },
    ],
  },
  {
    title: "Emoji Management",
    shortcuts: [
      { action: "Set Emoji", description: "Set custom emoji for company" },
      { action: "Reset to Favicon", description: "Reset to default favicon" },
      { action: "Refresh Favicon", description: "Refresh company favicon" },
    ],
  },
];

export default function KeyboardShortcutsHelp() {
  const { pop } = useNavigation();

  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Back" onAction={pop} />
        </ActionPanel>
      }
    >
      {SHORTCUT_GROUPS.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.shortcuts.map((shortcut) => {
            const shortcutDisplay = shortcut.shortcutKey
              ? formatShortcut(KEYBOARD_SHORTCUTS[shortcut.shortcutKey])
              : shortcut.shortcutText
                ? shortcut.shortcutText
                : "No shortcut";
            return (
              <List.Item
                key={shortcut.action}
                title={shortcut.action}
                subtitle={shortcut.description}
                accessories={[{ text: shortcutDisplay }]}
                icon="⌨️"
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
