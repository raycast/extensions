import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CreateSupertagAction } from "./SupertagCreateForm";
import { EditSupertagAction } from "./SupertagEditForm";
import { deleteSupertag, useTanaLocal } from "../state";

export function SupertagsList() {
  const { supertags } = useTanaLocal();
  return (
    <List
      searchBarPlaceholder="Search supertags..."
      actions={
        <ActionPanel>
          <CreateSupertagAction />
        </ActionPanel>
      }
    >
      {supertags.map((node) => (
        <List.Item
          key={node.id}
          id={node.id}
          title={node.name}
          icon={{ source: Icon.Tag, tintColor: node.color }}
          accessories={[{ tag: node.id }]}
          actions={
            <ActionPanel>
              <EditSupertagAction node={node} />
              <CreateSupertagAction />
              <Action
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                title="Delete Supertag"
                onAction={() => {
                  deleteSupertag(node.id);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
