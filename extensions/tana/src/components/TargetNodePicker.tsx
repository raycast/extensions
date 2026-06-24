import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { SearchNode, TanaWorkspace } from "../api/contracts";
import { requireTools } from "../api/capabilities";
import { createPreferenceClient, getTanaPreferences } from "../api/preferenceClient";
import { listWorkspaces, searchNodes } from "../api/tanaService";
import { TanaLocalNode, addTargetNode } from "../state";
import { CreateTargetNodeManualAction } from "./TargetNodeCreateForm";

type Props = { workspaceId?: string; onCreate?: (node: TanaLocalNode) => void };

export function TargetNodePicker({ workspaceId: requestedWorkspaceId, onCreate }: Props) {
  const { pop } = useNavigation();
  const configuredWorkspaceId = getTanaPreferences().workspaceId?.trim() || "";
  const defaultWorkspaceId = requestedWorkspaceId || configuredWorkspaceId;
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId);
  const [workspaces, setWorkspaces] = useState<TanaWorkspace[]>([]);
  const [query, setQuery] = useState("");
  const [nodes, setNodes] = useState<SearchNode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const discover = async () => {
      try {
        const client = createPreferenceClient(defaultWorkspaceId);
        await requireTools(client, ["list_workspaces", "search_nodes"]);
        const items = await listWorkspaces(client);
        if (!active) return;
        setWorkspaces(requestedWorkspaceId ? items.filter(({ id }) => id === requestedWorkspaceId) : items);
        if (!workspaceId && items[0]) setWorkspaceId(items[0].id);
      } catch (error) {
        if (active) {
          await showToast(Toast.Style.Failure, "Target discovery failed", error instanceof Error ? error.message : "");
        }
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
    if (!text || !workspaceId) {
      setNodes([]);
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchNodes(createPreferenceClient(workspaceId), text, workspaceId, 50, controller.signal)
        .then(
          (results) => {
            if (!controller.signal.aborted) setNodes(results);
          },
          async (error) => {
            if (!controller.signal.aborted) {
              await showToast(Toast.Style.Failure, "Target search failed", error instanceof Error ? error.message : "");
            }
          },
        )
        .finally(() => !controller.signal.aborted && setLoading(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, workspaceId]);

  const pin = async (node: SearchNode) => {
    try {
      const target = { id: node.id, name: node.name || "Untitled" };
      if (!requestedWorkspaceId || workspaceId === configuredWorkspaceId) addTargetNode(target);
      onCreate?.(target);
      await showToast(
        Toast.Style.Success,
        !requestedWorkspaceId || workspaceId === configuredWorkspaceId ? "Target pinned" : "Target selected",
        target.name,
      );
      pop();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Could not pin target", error instanceof Error ? error.message : "");
    }
  };

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search a node to pin…"
      searchBarAccessory={
        <List.Dropdown tooltip="Workspace" value={workspaceId} onChange={setWorkspaceId}>
          {workspaces.map((workspace) => (
            <List.Dropdown.Item key={workspace.id} title={workspace.name || workspace.id} value={workspace.id} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <CreateTargetNodeManualAction shortcut={false} onCreate={onCreate} />
        </ActionPanel>
      }
    >
      {nodes.map((node) => (
        <List.Item
          key={node.id}
          title={node.name || "Untitled"}
          subtitle={node.breadcrumb.join(" › ")}
          icon={Icon.Pin}
          actions={
            <ActionPanel>
              <Action title="Pin Target" icon={Icon.Pin} onAction={() => pin(node)} />
              <CreateTargetNodeManualAction shortcut={false} onCreate={onCreate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function CreateTargetNodeAction({ shortcut = true, ...props }: Props & { shortcut?: boolean }) {
  return (
    <Action.Push
      title="Find and Pin Target"
      target={<TargetNodePicker {...props} />}
      icon={Icon.MagnifyingGlass}
      shortcut={shortcut ? { modifiers: ["cmd"], key: "n" } : undefined}
    />
  );
}
