import type { ComponentType } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import RenameCommand from "./commands/rename";
import ReplaceCommand from "./commands/replace";
import HistoryCommand from "./commands/history";
import PresetsCommand from "./commands/presets";
import ClipboardRenameCommand from "./commands/clipboard-rename";
import AISuggestCommand from "./commands/ai-suggest";
import { SelectionMode } from "./types";

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: Icon;
  color: Color;
  component: ComponentType<{ mode?: SelectionMode }>;
  mode?: SelectionMode;
  section?: "main" | "advanced";
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "rename",
    title: "Rename File(s)",
    subtitle: "Batch rename with prefix, suffix, numbering, and case transformation",
    icon: Icon.Pencil,
    color: Color.Blue,
    component: RenameCommand,
    mode: SelectionMode.FILES,
    section: "main",
  },
  {
    id: "rename-folders",
    title: "Rename Folder(s)",
    subtitle: "Batch rename folders with prefix, suffix, numbering, and case transformation",
    icon: Icon.Folder,
    color: Color.Blue,
    component: RenameCommand,
    mode: SelectionMode.FOLDERS,
    section: "main",
  },
  {
    id: "replace",
    title: "Replace in File Names",
    subtitle: "Find and replace in filenames with optional regex",
    icon: Icon.MagnifyingGlass,
    color: Color.Orange,
    component: ReplaceCommand,
    mode: SelectionMode.FILES,
    section: "main",
  },
  {
    id: "replace-folders",
    title: "Replace in Folder Names",
    subtitle: "Find and replace in folder names with optional regex",
    icon: Icon.MagnifyingGlass,
    color: Color.Orange,
    component: ReplaceCommand,
    mode: SelectionMode.FOLDERS,
    section: "main",
  },
  {
    id: "clipboard",
    title: "Rename from Clipboard",
    subtitle: "Use names from clipboard to rename selected files",
    icon: Icon.Clipboard,
    color: Color.Purple,
    component: ClipboardRenameCommand,
    mode: SelectionMode.FILES,
    section: "advanced",
  },
  {
    id: "ai-suggest",
    title: "AI Smart Rename",
    subtitle: "Generate descriptive names using AI (Pro)",
    icon: Icon.Stars,
    color: Color.Magenta,
    component: AISuggestCommand,
    mode: SelectionMode.FILES,
    section: "advanced",
  },
  {
    id: "history",
    title: "Rename History",
    subtitle: "View and undo recent rename operations",
    icon: Icon.Clock,
    color: Color.Green,
    component: HistoryCommand,
    section: "main",
  },
  {
    id: "presets",
    title: "Presets",
    subtitle: "Manage saved rename configurations",
    icon: Icon.Bookmark,
    color: Color.Yellow,
    component: PresetsCommand,
    section: "main",
  },
];

export default function Command() {
  const mainItems = MENU_ITEMS.filter((item) => item.section !== "advanced");
  const advancedItems = MENU_ITEMS.filter((item) => item.section === "advanced");

  return (
    <List searchBarPlaceholder="Select an action...">
      <List.Section title="Actions">
        {mainItems.map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            icon={{ source: item.icon, tintColor: item.color }}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Open ${item.title}`}
                  icon={item.icon}
                  target={<item.component mode={item.mode} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Advanced">
        {advancedItems.map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            icon={{ source: item.icon, tintColor: item.color }}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Open ${item.title}`}
                  icon={item.icon}
                  target={<item.component mode={item.mode} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
