import { ActionPanel, List } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";

export function EmptyView(props: { title: string; extensionPreferences: boolean }) {
  const { title, extensionPreferences } = props;
  return (
    <List.EmptyView
      title={title}
      icon={"empty-icon.png"}
      actions={<ActionPanel>{extensionPreferences && <ActionOpenPreferences />}</ActionPanel>}
    />
  );
}
