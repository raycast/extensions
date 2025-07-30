import {
  Detail,
  ActionPanel,
  Action,
  openExtensionPreferences,
} from "@raycast/api";

interface ErrorViewProps {
  error: string;
}

export function ErrorView({ error }: ErrorViewProps) {
  return (
    <Detail
      markdown={`# Error\n${error}\n\nPlease check your API key in the extension preferences.`}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
