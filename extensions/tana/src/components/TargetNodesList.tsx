import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AddTargetNodeAction, EditTargetNodeAction } from "./TargetNodeForm";
import { useState } from "react";
import { deleteTargetNode, useTanaLocal } from "../state";

export function TargetNodesList() {
  const [searchText, setSearchText] = useState<string>("");
  const { targetNodes } = useTanaLocal();
  return (
    <List
      filtering
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search target nodes..."
      actions={
        <ActionPanel>
          <AddTargetNodeAction node={{ name: searchText, id: "" }} />
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
                title="Delete target node"
                onAction={() => {
                  deleteTargetNode(node.id);
                }}
              />
              <AddTargetNodeAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
