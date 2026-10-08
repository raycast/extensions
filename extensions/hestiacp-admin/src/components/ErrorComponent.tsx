import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export default function ErrorComponent({ error, showAction = false }: { error: Error; showAction?: boolean }) {
  const markdown = `# ERROR 
    
${error.cause || "Something went wrong"}

${error.message}`;

  return (
    <Detail
      navigationTitle="Error"
      markdown={markdown}
      actions={
        !showAction ? undefined : (
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        )
      }
    />
  );
}
