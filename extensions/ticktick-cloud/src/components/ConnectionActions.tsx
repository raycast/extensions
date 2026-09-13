import { Action, ActionPanel, type Keyboard } from "@raycast/api";
import type { ReactElement } from "react";

import type { ErrorPresentation, ErrorRecoveryAction } from "../application/errorPresentation";

export type ConnectionActionKey = ErrorRecoveryAction["kind"];
export type ConnectionActionShortcut = Keyboard.Shortcut;

export type ConnectionActionItem = Readonly<{
  key: ConnectionActionKey;
  title: "Reconnect" | "Open Preferences" | "Refresh" | "Retry";
  shortcut: ConnectionActionShortcut;
}>;

export type ConnectionActionHandler = () => void | Promise<void>;

export type ConnectionActionsProps = Readonly<{
  presentation: ErrorPresentation;
  onReconnect?: ConnectionActionHandler;
  onOpenPreferences?: ConnectionActionHandler;
  onRefresh?: ConnectionActionHandler;
  onRetry?: ConnectionActionHandler;
}>;

type MacModifier = "cmd" | "ctrl" | "opt" | "shift";
type WindowsModifier = "ctrl" | "alt" | "shift" | "windows";

function platformShortcut(
  macOS: Readonly<{ modifiers: readonly MacModifier[]; key: Keyboard.KeyEquivalent }>,
  Windows: Readonly<{ modifiers: readonly WindowsModifier[]; key: Keyboard.KeyEquivalent }>
): ConnectionActionShortcut {
  const macOSModifiers: Keyboard.KeyModifier[] = [...macOS.modifiers];
  const windowsModifiers: Keyboard.KeyModifier[] = [...Windows.modifiers];
  const shortcut = {
    macOS: { modifiers: macOSModifiers, key: macOS.key },
    Windows: { modifiers: windowsModifiers, key: Windows.key },
  } satisfies Keyboard.Shortcut;

  Object.freeze(macOSModifiers);
  Object.freeze(windowsModifiers);
  Object.freeze(shortcut.macOS);
  Object.freeze(shortcut.Windows);
  return Object.freeze(shortcut);
}

function item(
  key: ConnectionActionKey,
  title: ConnectionActionItem["title"],
  shortcut: ConnectionActionShortcut
): ConnectionActionItem {
  return Object.freeze({ key, title, shortcut });
}

const ACTION_ITEMS: Readonly<Record<ConnectionActionKey, ConnectionActionItem>> = Object.freeze({
  reconnect: item(
    "reconnect",
    "Reconnect",
    platformShortcut({ modifiers: ["cmd", "shift"], key: "r" }, { modifiers: ["ctrl", "shift"], key: "r" })
  ),
  "open-preferences": item(
    "open-preferences",
    "Open Preferences",
    platformShortcut({ modifiers: ["cmd"], key: "," }, { modifiers: ["ctrl"], key: "," })
  ),
  refresh: item(
    "refresh",
    "Refresh",
    platformShortcut({ modifiers: ["cmd"], key: "r" }, { modifiers: ["ctrl"], key: "r" })
  ),
  retry: item("retry", "Retry", platformShortcut({ modifiers: ["cmd"], key: "r" }, { modifiers: ["ctrl"], key: "r" })),
});

export function buildConnectionActionItems(presentation: ErrorPresentation): readonly ConnectionActionItem[] {
  return Object.freeze(presentation.actions.map((action) => ACTION_ITEMS[action.kind]));
}

export function ConnectionActions({
  presentation,
  onReconnect,
  onOpenPreferences,
  onRefresh,
  onRetry,
}: ConnectionActionsProps): ReactElement | null {
  const handlers: Readonly<Partial<Record<ConnectionActionKey, ConnectionActionHandler>>> = {
    reconnect: onReconnect,
    "open-preferences": onOpenPreferences,
    refresh: onRefresh,
    retry: onRetry,
  };
  const availableItems = buildConnectionActionItems(presentation).filter((actionItem) => handlers[actionItem.key]);

  if (availableItems.length === 0) return null;

  return (
    <ActionPanel.Section title="Connection">
      {availableItems.map((actionItem) => (
        <Action
          key={actionItem.key}
          title={actionItem.title}
          shortcut={actionItem.shortcut}
          onAction={handlers[actionItem.key] as ConnectionActionHandler}
        />
      ))}
    </ActionPanel.Section>
  );
}

export default ConnectionActions;
