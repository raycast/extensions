import { Action, Icon } from "@raycast/api";

import type { ViewProps } from "../hooks/useViewReminders";

export default function CompletedRemindersAction({ completed }: { completed: ViewProps["completed"] }) {
  return (
    <Action
      title={`${completed.value ? "Hide" : "Display"} Completed Reminders`}
      icon={completed.value ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      onAction={() => completed.toggle()}
    />
  );
}
