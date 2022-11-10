import { ActionPanel, List } from "@raycast/api";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function ListEmptyView(props: { title: string; command: boolean; extension: boolean }) {
  const { title, command, extension } = props;
  return (
    <List.EmptyView
      title={title}
      icon={{ source: { light: "timezone-empty-icon.svg", dark: "timezone-empty-icon@dark.svg" } }}
      actions={
        <ActionPanel>
          <ActionOpenCommandPreferences command={command} extension={extension} />
        </ActionPanel>
      }
    />
  );
}
