import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useShortcuts } from "./hooks/useConfig";
import { parseShortcutKey } from "./utils/keys";
import { executeShortcutInMode } from "./utils/executeShortcut";

export default function Command() {
  const { shortcuts, isLoading, error } = useShortcuts();

  return (
    <List isLoading={isLoading} navigationTitle="Keyboard Shortcuts" searchBarPlaceholder="Search your shortcuts">
      {error ? (
        <List.EmptyView
          title="Failed to Load Config"
          description={error instanceof Error ? error.message : String(error)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Install Aerospace"
                url="https://nikitabobko.github.io/AeroSpace/guide#installation"
              />
            </ActionPanel>
          }
        />
      ) : (
        shortcuts.map((shortcut) => {
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
        })
      )}
    </List>
  );
}
