import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreateTargetNodeAction } from "./TargetNodeCreateForm";
import { EditTargetNodeAction } from "./TargetNodeEditForm";
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
            <ActionPanel>
              <EditTargetNodeAction node={node} />
              <Action
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                title="Delete Target Node"
                onAction={() => {
                  deleteTargetNode(node.id);
                }}
              />
              <CreateTargetNodeAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
