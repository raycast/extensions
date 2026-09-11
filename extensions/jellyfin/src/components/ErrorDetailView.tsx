import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

export default function ErrorDetailView({
  children,
  errorMessage,
}: {
  children: React.ReactNode;
  errorMessage: string | undefined;
}) {
  if (errorMessage) {
    return (
      <Detail
        markdown={errorMessage}
        actions={
          <ActionPanel title="Actions">
            <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
          </ActionPanel>
        }
      />
    );
  }
  return children;
}
