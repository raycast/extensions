import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

type ErrorComponentProps = {
  error: string;
};
export default function ErrorComponent({ error }: ErrorComponentProps) {
  return (
    <Detail
      markdown={"⚠️" + error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
