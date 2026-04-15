import { Action, ActionPanel, openExtensionPreferences } from "@raycast/api";

interface HibpActionsProps {
  copyContent?: string;
  copyTitle?: string;
  needsApiKey?: boolean;
  onClearHistory?: () => void;
}

export const HibpActions = ({ copyContent, copyTitle, needsApiKey, onClearHistory }: HibpActionsProps) => (
  <ActionPanel>
    {copyContent && <Action.CopyToClipboard title={copyTitle ?? "Copy"} content={copyContent} />}
    <Action.OpenInBrowser title="Open Haveibeenpwned.com" url="https://haveibeenpwned.com" />
    {needsApiKey && <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />}

    {onClearHistory && <Action title="Clear History" onAction={onClearHistory} />}
  </ActionPanel>
);
