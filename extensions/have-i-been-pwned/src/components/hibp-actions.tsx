import { Action, ActionPanel, Alert, confirmAlert, openExtensionPreferences } from "@raycast/api";

interface HibpActionsProps {
  copyContent?: string;
  copyTitle?: string;
  needsApiKey?: boolean;
  onClearHistory?: () => Promise<void>;
}

export const HibpActions = ({ copyContent, copyTitle, needsApiKey, onClearHistory }: HibpActionsProps) => (
  <ActionPanel>
    {copyContent && <Action.CopyToClipboard title={copyTitle ?? "Copy"} content={copyContent} />}
    <Action.OpenInBrowser title="Open Haveibeenpwned.com" url="https://haveibeenpwned.com" />
    {needsApiKey && <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />}

    {onClearHistory && (
      <Action
        title="Clear History"
        style={Action.Style.Destructive}
        onAction={async () => {
          if (
            await confirmAlert({
              title: "Clear History",
              message: "This will permanently remove your HIBP lookup history.",
              primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
            })
          ) {
            await onClearHistory();
          }
        }}
      />
    )}
  </ActionPanel>
);
