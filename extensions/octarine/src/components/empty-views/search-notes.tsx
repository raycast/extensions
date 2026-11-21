import { List } from "@raycast/api";
import type { ReactNode } from "react";

type Props = {
  actions?: ReactNode;
};

export function SearchNotesEmptyView({ actions }: Props) {
  return <List.EmptyView title="No notes found" description="Try a different search" actions={actions} />;
}
