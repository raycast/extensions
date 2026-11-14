import type { ReactNode } from "react";
import { Icon, List } from "@raycast/api";

export function DailyNotesEmptyView({ actions }: { actions?: ReactNode }) {
  return (
    <List.EmptyView
      icon={Icon.Calendar}
      title="No Daily Desk notes found"
      description="Type a date to open or create a Daily Desk note"
      actions={actions}
    />
  );
}
