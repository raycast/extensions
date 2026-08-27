import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useShortcuts } from "./hooks/useConfig";
import { parseShortcutKey } from "./utils/keys";
import { executeShortcutInMode } from "./utils/executeShortcut";
import { AeroSpaceRecoveryActions } from "./components/AeroSpaceRecoveryActions";

export default function Command() {
  const { shortcuts, isLoading, error, revalidate } = useShortcuts();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search shortcuts, keys, or modes">
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
            error ? (
              <AeroSpaceRecoveryActions error={error} onRetry={revalidate} />
            ) : (
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open AeroSpace Binding Guide"
                  url="https://nikitabobko.github.io/AeroSpace/guide#binding-modes"
                />
              </ActionPanel>
            )
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
            keywords={[shortcut.mode, shortcut.key]}
            accessories={[{ text: shortcut.mode }]}
            actions={
              <ActionPanel>
                <Action
                  title="Activate"
                  shortcut={parsed ?? undefined}
                  onAction={() => executeShortcutInMode(shortcut)}
                />
                <Action
                  title="Refresh Shortcuts"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={async () => {
                    await revalidate();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
