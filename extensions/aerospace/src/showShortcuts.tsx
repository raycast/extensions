import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useShortcuts } from "./hooks/useConfig";
import { parseShortcutKey } from "./utils/keys";
import { executeShortcutInMode } from "./utils/executeShortcut";

export default function Command() {
  const { shortcuts, isLoading, error } = useShortcuts();

  return (
    <List isLoading={isLoading} navigationTitle="Keyboard Shortcuts" searchBarPlaceholder="Search your shortcuts">
      {!isLoading && shortcuts.length === 0 && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.Keyboard}
          title={error ? "Failed to Load Shortcuts" : "No Shortcuts Found"}
          description={
            error
              ? error.message
              : "No key bindings were found in your AeroSpace config. Add a [mode.main.binding] section to get started."
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Aerospace Guide"
                url="https://nikitabobko.github.io/AeroSpace/guide#binding-modes"
              />
            </ActionPanel>
          }
        />
      )}
      {shortcuts.map((shortcut) => {
        const parsed = parseShortcutKey(shortcut.key);
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
                  shortcut={parsed ?? undefined}
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
