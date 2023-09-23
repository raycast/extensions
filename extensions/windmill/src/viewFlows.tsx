import { useFetchWorkspaces } from "./hooks/useFetchWorkspaces";
import { useFetchList } from "./hooks/useFetchList";
import { ItemList } from "./components/ItemList";
import { useEffect, useState } from "react";

const kind = "flow";

export default function ListFlowsCommand() {
  const { workspaces, isLoading: workspacesLoading } = useFetchWorkspaces();
  const { items, refreshItems, isLoading: listLoading } = useFetchList(kind, workspaces);
  return (
    <ItemList
      isLoading={workspacesLoading || listLoading}
      kind={kind}
      items={items}
      workspaces={workspaces}
      refreshItems={refreshItems}
    />
  );
}
