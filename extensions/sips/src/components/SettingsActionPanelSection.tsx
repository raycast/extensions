/**
 * @file components/SettingsActionPanelSection.tsx
 *
 * @summary Action panel for opening command and extension preferences.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 16:46:33
 * Last modified  : 2024-06-26 21:37:46
 */

import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export default function SettingsActionPanelSection() {
  return (
    <ActionPanel.Section title="Settings">
      <Action
        title="Configure Command"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        onAction={async () => {
          await openCommandPreferences();
        }}
      />
      <Action
        title="Configure Extension"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["opt", "cmd"], key: "," }}
        onAction={async () => {
          await openExtensionPreferences();
        }}
      />
    </ActionPanel.Section>
  );
}
