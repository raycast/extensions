import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { SearchNode, TanaWorkspace } from "./api/contracts";
import { requireTools } from "./api/capabilities";
import { createPreferenceClient, getTanaPreferences } from "./api/preferenceClient";
import { listWorkspaces, searchNodes } from "./api/tanaService";
import { NodeActions } from "./components/NodeActions";

export default function Command() {
  const defaultWorkspaceId = getTanaPreferences().workspaceId?.trim() ?? "";
  const [query, setQuery] = useState("");
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId);
  const [workspaces, setWorkspaces] = useState<TanaWorkspace[]>([]);
  const [nodes, setNodes] = useState<SearchNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const discover = async () => {
      try {
        const client = createPreferenceClient(defaultWorkspaceId);
        await requireTools(client, ["list_workspaces", "search_nodes", "read_node", "get_children"]);
        const items = await listWorkspaces(client);
        if (!active) return;
        setWorkspaces(items);
        if (!workspaceId && items[0]) setWorkspaceId(items[0].id);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to discover workspaces");
      }
    };
    void discover();
    return () => {
      active = false;
    };
  }, [defaultWorkspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    const text = query.trim();
    if (!text) {
      setNodes([]);
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchNodes(createPreferenceClient(workspaceId), text, workspaceId || undefined, 50, controller.signal).then(
        (results) => {
          if (!controller.signal.aborted) {
            setNodes(results);
            setError(undefined);
            setLoading(false);
          }
        },
        (reason) => {
          if (!controller.signal.aborted) {
            setError(reason instanceof Error ? reason.message : "Search failed");
            setLoading(false);
          }
        },
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, revision, workspaceId]);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Tana nodes…"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Workspace" value={workspaceId} onChange={setWorkspaceId}>
          {workspaces.map((workspace) => (
            <List.Dropdown.Item key={workspace.id} title={workspace.name || workspace.id} value={workspace.id} />
          ))}
        </List.Dropdown>
      }
    >
      {nodes.map((node) => (
        <List.Item
          key={node.id}
          title={node.name || "Untitled"}
          subtitle={node.breadcrumb.join(" › ") || node.description}
          icon={node.inTrash ? Icon.Trash : Icon.Document}
          accessories={[
            ...node.tags.slice(0, 2).map((tag) => ({ tag: tag.name })),
            { text: workspaces.find(({ id }) => id === node.workspaceId)?.name || node.workspaceId },
          ]}
          actions={<NodeActions node={node} onMutate={() => setRevision((value) => value + 1)} />}
        />
      ))}
      {!loading && (
        <List.EmptyView
          title={error ? "Search Unavailable" : query ? "No Matching Nodes" : "Search Tana"}
          description={
            error || (query ? "Try a different query or workspace." : "Type to search the selected workspace.")
          }
          icon={error ? Icon.Warning : Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
