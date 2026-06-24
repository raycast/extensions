import { Action, ActionPanel, Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import type { ReactNode } from "react";
import { createPreferenceClient } from "../api/preferenceClient";
import { setNodeDone, trashNode } from "../api/tanaService";
import { EditNodeForm } from "./EditNodeForm";
import { FieldContentForm } from "./FieldContentForm";
import { FieldOptionForm } from "./FieldOptionForm";
import { NodeDetail } from "./NodeDetail";
import { NodeTagForm } from "./NodeTagForm";
import { MoveNodeForm } from "./MoveNodeForm";
import { runConfirmedAction } from "../policies";
import { openNodeInTana } from "../openInTana";

export type NodeRef = {
  id: string;
  name: string;
  description?: string | null;
  workspaceId?: string;
};

type NodeActionsProps = {
  node: NodeRef;
  onMutate?: () => void;
  additionalActions?: ReactNode;
};

const mutate = async (title: string, action: () => Promise<unknown>, onMutate?: () => void) => {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await action();
    toast.style = Toast.Style.Success;
    toast.title = title.replace(/ing$/, "ed");
    onMutate?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
};

export function NodeActions({ node, onMutate, additionalActions }: NodeActionsProps) {
  const client = createPreferenceClient(node.workspaceId);
  return (
    <ActionPanel>
      <Action.Push title="Read Node" icon={Icon.Eye} target={<NodeDetail node={node} />} />
      <Action
        title="Open in Tana"
        icon={Icon.AppWindow}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={() => openNodeInTana(client, node)}
      />
      <Action title="Open in Tana Panel" icon={Icon.Sidebar} onAction={() => openNodeInTana(client, node, "panel")} />
      <Action title="Open in Tana Tab" icon={Icon.Window} onAction={() => openNodeInTana(client, node, "tab")} />
      <ActionPanel.Section title="Status">
        <Action
          title="Mark Done"
          icon={Icon.CheckCircle}
          onAction={() => mutate("Marking Done", () => setNodeDone(client, node.id, true), onMutate)}
        />
        <Action
          title="Mark Not Done"
          icon={Icon.Circle}
          onAction={() => mutate("Marking Not Done", () => setNodeDone(client, node.id, false), onMutate)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Properties">
        <Action.Push title="Update Tags" icon={Icon.Tag} target={<NodeTagForm node={node} onMutate={onMutate} />} />
        <Action.Push
          title="Set Field Content"
          icon={Icon.Pencil}
          target={<FieldContentForm node={node} onMutate={onMutate} />}
        />
        <Action.Push
          title="Set Field Option"
          icon={Icon.List}
          target={<FieldOptionForm node={node} onMutate={onMutate} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Structure">
        <Action.Push title="Edit Node" icon={Icon.Pencil} target={<EditNodeForm node={node} onMutate={onMutate} />} />
        <Action.Push
          title="Move Node"
          icon={Icon.ArrowRight}
          target={<MoveNodeForm node={node} onMutate={onMutate} />}
        />
        <Action
          title="Move Node to Trash"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: `Move “${node.name}” to Trash?`,
              message: "This changes your Tana workspace and cannot be undone from Raycast.",
              primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
            });
            await runConfirmedAction(confirmed, () =>
              mutate("Moving to Trash", () => trashNode(client, node.id), onMutate),
            );
          }}
        />
      </ActionPanel.Section>
      <Action.CopyToClipboard title="Copy Node ID" content={node.id} />
      {additionalActions}
    </ActionPanel>
  );
}
