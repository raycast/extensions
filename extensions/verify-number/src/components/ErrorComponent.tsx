import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

type ErrorComponentProps = {
  error: string;
};
export default function ErrorComponent({ error }: ErrorComponentProps) {
  const markdown = `## ERROR: ${error}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
