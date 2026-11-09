import { Action, ActionPanel, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import type { ReactNode } from "react";
import { resolveShortcuts, type Shortcuts } from "./helpers/shortcuts";

let shortcuts: Shortcuts | undefined;
export function getShortcuts(): Shortcuts {
  // Raycast loads preferences when a command starts; reopen it after changing settings.
  return (shortcuts ??= resolveShortcuts(getPreferenceValues<Preferences>()));
}

export function ShortcutSettingsGate({ children }: { children: ReactNode }) {
  try {
    getShortcuts();
  } catch (cause) {
    return (
      <Detail
        markdown={`# Check ME Keyboard Shortcuts\n\n${(cause as Error).message}\n\nOpen ME settings, correct the shortcut, then reopen this command.`}
        actions={
          <ActionPanel>
            <Action title="Open ME Settings" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
  return <>{children}</>;
}
