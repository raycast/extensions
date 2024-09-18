import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export default function InitError({ errMarkdown }: { errMarkdown: string }) {
  return (
    <Detail
      navigationTitle="Failed to initialize your snippets store"
      markdown={errMarkdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
