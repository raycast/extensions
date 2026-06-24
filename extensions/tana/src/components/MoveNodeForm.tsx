import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { SearchNode } from "../api/contracts";
import { createPreferenceClient } from "../api/preferenceClient";
import { moveNodeSafely, searchNodes } from "../api/tanaService";
import { resolveMoveTargetNodeId } from "../policies";
import type { NodeRef } from "./NodeActions";

type Values = { targetNodeId: string; manualTargetNodeId: string; position: string };

export function MoveNodeForm({ node, onMutate }: { node: NodeRef; onMutate?: () => void }) {
  const { pop } = useNavigation();
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<SearchNode[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Validating Move");
      try {
        const targetNodeId = resolveMoveTargetNodeId(values.targetNodeId, values.manualTargetNodeId);
        if (!targetNodeId) throw new Error("Select a parent or enter its node ID");
        await moveNodeSafely(
          createPreferenceClient(node.workspaceId),
          node.id,
          targetNodeId,
          values.position === "start" ? "start" : "end",
        );
        toast.style = Toast.Style.Success;
        toast.title = "Node Moved";
        onMutate?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    initialValues: { targetNodeId: "", manualTargetNodeId: "", position: "end" },
  });

  useEffect(() => {
    const controller = new AbortController();
    const text = query.trim();
    if (!text) {
      setTargets([]);
      return () => controller.abort();
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchNodes(createPreferenceClient(node.workspaceId), text, node.workspaceId, 50, controller.signal)
        .then(
          (items) => {
            if (!controller.signal.aborted) setTargets(items.filter(({ id }) => id !== node.id));
          },
          async (error) => {
            if (!controller.signal.aborted)
              await showToast(
                Toast.Style.Failure,
                "Target Search Failed",
                error instanceof Error ? error.message : undefined,
              );
          },
        )
        .finally(() => !controller.signal.aborted && setLoading(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [node.id, node.workspaceId, query]);

  return (
    <Form
      isLoading={loading}
      navigationTitle={`Move · ${node.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Move Node" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="targetSearch" title="Find Parent" value={query} onChange={setQuery} />
      <Form.Dropdown title="New Parent" {...itemProps.targetNodeId}>
        {targets.map((target) => (
          <Form.Dropdown.Item key={target.id} title={target.name || "Untitled"} value={target.id} icon={Icon.Folder} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Parent Node ID (optional)"
        placeholder="Fallback while Tana search is indexing"
        {...itemProps.manualTargetNodeId}
      />
      <Form.Dropdown title="Position" {...itemProps.position}>
        <Form.Dropdown.Item title="End" value="end" />
        <Form.Dropdown.Item title="Start" value="start" />
      </Form.Dropdown>
      <Form.Description text="The move is blocked if the selected parent is this node or one of its descendants." />
    </Form>
  );
}
