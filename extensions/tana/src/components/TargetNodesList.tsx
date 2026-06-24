import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreateTargetNodeAction } from "./TargetNodePicker";
import { EditTargetNodeAction } from "./TargetNodeEditForm";
import { NodeActions } from "./NodeActions";
import { deleteTargetNode, useTanaLocal } from "../state";

export function TargetNodesList() {
  const { targetNodes } = useTanaLocal();
  return (
    <List
      searchBarPlaceholder="Search target nodes..."
      actions={
        <ActionPanel>
          <CreateTargetNodeAction />
        </ActionPanel>
      }
    >
      {targetNodes.map((node) => (
        <List.Item
          key={node.id}
          id={node.id}
          title={node.name}
          icon={Icon.Dot}
          accessories={[{ tag: node.id }]}
          actions={
            <NodeActions
              node={node}
              additionalActions={
                <ActionPanel.Section title="Pinned Target">
                  <EditTargetNodeAction node={node} />
                  <Action
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    title="Delete Pinned Target"
                    onAction={() => {
                      deleteTargetNode(node.id);
                    }}
                  />
                  <CreateTargetNodeAction />
                </ActionPanel.Section>
              }
            />
          }
        />
      ))}
    </List>
  );
}
