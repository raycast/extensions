import { useFetchWorkspaces } from "./hooks/useFetchWorkspaces";
import { useFetchList } from "./hooks/useFetchList";
import { ItemList } from "./components/ItemList";

export default function ViewAppsCommand() {
  const { workspaces, isLoading: workspacesLoading } = useFetchWorkspaces();
  const { items, refreshItems, isLoading: listLoading } = useFetchList("app", workspaces);
  return (
    <ItemList
      isLoading={workspacesLoading || listLoading}
      items={items}
      workspaces={workspaces}
      refreshItems={refreshItems}
    />
  );
}
