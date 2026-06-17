import { Action, ActionPanel } from "@raycast/api";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function ActionOpenNetworkSpeed(props: { value: string }) {
  const { value } = props;
  return (
    <>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Network Speed Info" content={value} />
      </ActionPanel.Section>
      <ActionOpenCommandPreferences />
    </>
  );
}
