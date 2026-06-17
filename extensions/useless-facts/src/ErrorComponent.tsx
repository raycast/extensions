import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

type ErrorComponentProps = {
  error: Error;
};
export default function ErrorComponent({ error }: ErrorComponentProps) {
  const markdown = `# ERROR
    
${error.message}`;

  return (
    <Detail
      navigationTitle="Error"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {Object.entries(error).map(([key, val]) => (
            <Detail.Metadata.Label key={key} title={key} text={val} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  );
}
