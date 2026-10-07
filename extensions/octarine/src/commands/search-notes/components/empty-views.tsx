import type { ReactNode } from "react";
import { Icon, List } from "@raycast/api";

type Props = {
  actions?: ReactNode;
};

export function NotesEmptyView({ actions }: Props) {
  return (
    <List.EmptyView
      icon={Icon.Document}
      title="No notes in any workspace"
      description="Create a note in Octarine to see it here"
      actions={actions}
    />
  );
}

export function PinnedNotesEmptyView({ actions }: Props) {
  return (
    <List.EmptyView
      icon={Icon.Tack}
      title="No pinned notes"
      description="Pin a note in Octarine to see it here"
      actions={actions}
    />
  );
}
