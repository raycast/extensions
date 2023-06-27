import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

type Props = {
  error: string;
};
export default function ErrorComponent({ error }: Props) {
  return (
    <Detail
      markdown={`⚠️ ${error}
            
Please make sure your API Key is Valid and is set to "Full Access"`}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            icon={Icon.WrenchScrewdriver}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
