import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { useMemo } from "react";
import { useShortcuts } from "./hooks/useConfig";
import { parseShortcutKey } from "./utils/keys";
import { executeShortcutInMode } from "./utils/executeShortcut";
import { AeroSpaceRecoveryActions } from "./components/AeroSpaceRecoveryActions";
import { SHORTCUT_CATEGORY_ORDER, visibleShortcuts } from "./utils/config";

export default function Command() {
  const { shortcuts, isLoading, error, revalidate } = useShortcuts();
  const { showFullBindings } = getPreferenceValues<Preferences>();
  const grouped = useMemo(() => {
    const visible = visibleShortcuts(shortcuts, showFullBindings !== false);
    return SHORTCUT_CATEGORY_ORDER.map((category) => ({
      category,
      shortcuts: visible.filter((shortcut) => shortcut.category === category),
    })).filter((group) => group.shortcuts.length > 0);
  }, [shortcuts, showFullBindings]);
  const visibleCount = grouped.reduce((count, group) => count + group.shortcuts.length, 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search shortcuts, keys, or modes">
      {!isLoading && visibleCount === 0 && (
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
      {grouped.map((group) => (
        <List.Section key={group.category} title={group.category}>
          {group.shortcuts.map((shortcut) => {
            const parsed = parseShortcutKey(shortcut.key);
            return (
              <List.Item
                key={`${shortcut.mode}-${shortcut.key}`}
                icon={Icon.ChevronRight}
                title={shortcut.title}
                subtitle={shortcut.command}
                keywords={[shortcut.mode, shortcut.key, shortcut.category, shortcut.command]}
                accessories={[{ text: shortcut.key }, ...(shortcut.mode !== "main" ? [{ tag: shortcut.mode }] : [])]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Activate Binding"
                      shortcut={parsed ?? undefined}
                      onAction={() => executeShortcutInMode(shortcut)}
                    />
                    <Action.CopyToClipboard title="Copy Raw Command" content={shortcut.command} />
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
        </List.Section>
      ))}
    </List>
  );
}
