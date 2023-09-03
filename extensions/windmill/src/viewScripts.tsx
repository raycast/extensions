import { useFetchWorkspaces } from "./hooks/useFetchWorkspaces";
import { useFetchList } from "./hooks/useFetchList";
import { ItemList } from "./components/ItemList";

const kind = 'script'

export default function ListFlowsCommand() {
  const { workspaces } = useFetchWorkspaces();
  const { items, refreshItems } = useFetchList(kind, workspaces);
  return <ItemList kind={kind} items={items} workspaces={workspaces} refreshItems={refreshItems} />
}

