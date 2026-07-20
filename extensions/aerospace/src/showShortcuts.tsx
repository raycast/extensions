import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useShortcuts } from "./hooks/useConfig";
import { parseShortcutKey } from "./utils/keys";
import { executeShortcutInMode } from "./utils/executeShortcut";

export default function Command() {
  const { shortcuts, isLoading } = useShortcuts();

  return (
    <List isLoading={isLoading} navigationTitle="Keyboard Shortcuts" searchBarPlaceholder="Search your shortcuts">
      {shortcuts.map((shortcut) => {
        const { modifiers, key } = parseShortcutKey(shortcut.key);
        return (
          <List.Item
            key={`${shortcut.mode}-${shortcut.key}`}
            icon={Icon.ChevronRight}
            title={shortcut.command}
            subtitle={shortcut.key}
            accessories={[{ text: shortcut.mode }]}
            actions={
              <ActionPanel>
                <Action
                  title="Activate"
                  shortcut={{ modifiers, key }}
                  onAction={() => executeShortcutInMode(shortcut)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
