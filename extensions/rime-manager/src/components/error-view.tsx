import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Detail
      markdown={`# Rime Configuration Could Not Be Loaded\n\n${error.message}\n\nMake sure a Rime frontend is installed, or select the correct user data directory in the extension preferences.`}
      actions={
        <ActionPanel>
          <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="View Rime for macOS" url="https://github.com/rime/squirrel" />
        </ActionPanel>
      }
    />
  );
}
