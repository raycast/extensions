import { ActionPanel, Action, Detail, openExtensionPreferences } from "@raycast/api";

export default function Preferences(props: { message: string }) {
  const markdown = props.message || "Press comand+enter to open the extension preferences.";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
