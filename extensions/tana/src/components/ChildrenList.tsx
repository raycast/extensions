import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ChildNodeSchema } from "../api/contracts";
import { createPreferenceClient } from "../api/preferenceClient";
import { getChildren } from "../api/tanaService";
import { AddToNodeForm } from "./AddToNodeForm";
import { NodeActions } from "./NodeActions";
import type { NodeRef } from "./NodeActions";

type ChildNode = z.infer<typeof ChildNodeSchema>;

export function ChildrenList({ node }: { node: NodeRef }) {
  const [children, setChildren] = useState<ChildNode[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = async (offset: number) => {
    setLoading(true);
    try {
      const result = await getChildren(createPreferenceClient(node.workspaceId), node.id, offset, 100);
      setChildren((current) => (offset ? [...current, ...result.children] : result.children));
      setHasMore(result.hasMore);
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load children");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(0);
  }, [node.id, node.workspaceId]);

  const addChildAction = (
    <Action.Push
      title="Add Note to This Node"
      icon={Icon.Plus}
      target={
        <AddToNodeForm
          enableDrafts={false}
          initialWorkspaceId={node.workspaceId}
          initialTargetNodeId={node.id}
          initialTargetNodeName={node.name}
          onCreated={() => load(0)}
        />
      }
    />
  );

  return (
    <List
      isLoading={loading}
      navigationTitle={`Children of ${node.name}`}
      actions={<ActionPanel>{addChildAction}</ActionPanel>}
    >
      {children.map((child) => {
        const childRef = { ...child, workspaceId: node.workspaceId };
        return (
          <List.Item
            key={child.id}
            title={child.name || "Untitled"}
            subtitle={child.description}
            icon={child.childCount ? Icon.Folder : Icon.Dot}
            accessories={child.tags.slice(0, 2).map((tag) => ({ tag: tag.name }))}
            actions={<NodeActions node={childRef} onMutate={() => load(0)} additionalActions={addChildAction} />}
          />
        );
      })}
      {hasMore && (
        <List.Item
          title="Load More"
          icon={Icon.ArrowDown}
          actions={
            <ActionPanel>
              <Action title="Load More" onAction={() => load(children.length)} />
              {addChildAction}
            </ActionPanel>
          }
        />
      )}
      {!loading && !children.length && (
        <List.EmptyView
          title={error ? "Unable to Load Children" : "No Child Notes"}
          description={error || `Create the first child under ${node.name}.`}
          icon={error ? Icon.Warning : Icon.Plus}
          actions={<ActionPanel>{addChildAction}</ActionPanel>}
        />
      )}
    </List>
  );
}
