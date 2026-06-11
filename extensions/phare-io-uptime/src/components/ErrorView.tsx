import { Detail, ActionPanel, Action, openExtensionPreferences, Icon } from "@raycast/api";

interface ErrorViewProps {
  error: string;
}

export function ErrorView({ error }: ErrorViewProps) {
  return (
    <Detail
      markdown={`# Error\n${error}\n\nPlease check your API key in the extension preferences.`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
