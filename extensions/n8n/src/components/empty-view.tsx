import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";

export function EmptyView(props: { title: string; extensionPreferences: boolean }) {
  const { title, extensionPreferences } = props;
  return (
    <List.EmptyView
      title={title}
      icon={"list-icon.svg"}
      actions={<ActionPanel>{extensionPreferences && <ActionOpenPreferences />}</ActionPanel>}
    />
  );
}
