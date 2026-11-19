import {
  Action,
  ActionPanel,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { SETTINGS_URL } from "./client";
export function ConnectionActions({ retry }: { retry?: () => void }) {
  return (
    <ActionPanel.Section title="Connection">
      {retry && (
        <Action title="Reload" icon={Icon.ArrowClockwise} onAction={retry} />
      )}
      <Action.OpenInBrowser title="Open Linqlo Settings" url={SETTINGS_URL} />
      <Action
        title="Update Integration Key"
        icon={Icon.Key}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
