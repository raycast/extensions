import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ChildNodeSchema, TanaWorkspace } from "./api/contracts";
import { requireTools } from "./api/capabilities";
import { createPreferenceClient, getTanaPreferences } from "./api/preferenceClient";
import { getCalendarNodeId, getChildren, listWorkspaces } from "./api/tanaService";
import { AddToNodeForm } from "./components/AddToNodeForm";
import { NodeActions } from "./components/NodeActions";

type ChildNode = z.infer<typeof ChildNodeSchema>;

export default function Command() {
  const defaultWorkspaceId = getTanaPreferences().workspaceId?.trim() || "";
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId);
  const [workspaces, setWorkspaces] = useState<TanaWorkspace[]>([]);
  const [children, setChildren] = useState<ChildNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const discover = async () => {
      try {
        const client = createPreferenceClient(defaultWorkspaceId);
        await requireTools(client, ["list_workspaces", "get_or_create_calendar_node", "get_children"]);
        const items = await listWorkspaces(client);
        if (!active) return;
        setWorkspaces(items);
        if (!workspaceId && items[0]) setWorkspaceId(items[0].id);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Workspace discovery failed");
      }
    };
    void discover();
    return () => {
      active = false;
    };
  }, [defaultWorkspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    if (!workspaceId) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    const loadToday = async () => {
      try {
        const client = createPreferenceClient(workspaceId);
        const nodeId = await getCalendarNodeId(client, workspaceId, undefined, controller.signal);
        const result = await getChildren(client, nodeId, 0, 100, controller.signal);
        if (!controller.signal.aborted) {
          setChildren(result.children);
          setError(undefined);
        }
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Today failed to load");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadToday();
    return () => controller.abort();
  }, [revision, workspaceId]);

  return (
    <List
      isLoading={loading}
      navigationTitle="Today in Tana"
      searchBarPlaceholder="Filter today's nodes…"
      searchBarAccessory={
        <List.Dropdown tooltip="Workspace" value={workspaceId} onChange={setWorkspaceId}>
          {workspaces.map((workspace) => (
            <List.Dropdown.Item key={workspace.id} title={workspace.name || workspace.id} value={workspace.id} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Add to Today"
            icon={Icon.Plus}
            target={
              <AddToNodeForm
                enableDrafts={false}
                initialWorkspaceId={workspaceId}
                initialTargetNodeId="TODAY"
                onCreated={() => setRevision((value) => value + 1)}
              />
            }
          />
        </ActionPanel>
      }
    >
      {children.map((child) => (
        <List.Item
          key={child.id}
          title={child.name || "Untitled"}
          subtitle={child.description}
          icon={child.childCount ? Icon.Folder : Icon.Circle}
          accessories={child.tags.slice(0, 2).map((tag) => ({ tag: tag.name }))}
          actions={
            <NodeActions
              node={{ ...child, workspaceId }}
              onMutate={() => setRevision((value) => value + 1)}
              additionalActions={
                <Action.Push
                  title="Add to Today"
                  icon={Icon.Plus}
                  target={
                    <AddToNodeForm
                      enableDrafts={false}
                      initialWorkspaceId={workspaceId}
                      initialTargetNodeId="TODAY"
                      onCreated={() => setRevision((value) => value + 1)}
                    />
                  }
                />
              }
            />
          }
        />
      ))}
      {!loading && !children.length && (
        <List.EmptyView
          title={error ? "Today Unavailable" : "Nothing Scheduled Today"}
          description={error || "Capture a node into today's daily note."}
          icon={error ? Icon.Warning : Icon.Calendar}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add to Today"
                icon={Icon.Plus}
                target={
                  <AddToNodeForm
                    enableDrafts={false}
                    initialWorkspaceId={workspaceId}
                    initialTargetNodeId="TODAY"
                    onCreated={() => setRevision((value) => value + 1)}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
