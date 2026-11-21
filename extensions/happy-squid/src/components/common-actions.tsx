import { Action, ActionPanel, Icon } from "@raycast/api";
import { useTasks } from "../task-state";

export function CommonActions() {
  const { refresh, signOut, busy } = useTasks();
  return (
    <ActionPanel.Section>
      <Action
        title="Refresh Tasks"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => refresh()}
      />
      {!busy && <Action title="Sign Out" icon={Icon.Logout} onAction={signOut} />}
    </ActionPanel.Section>
  );
}
