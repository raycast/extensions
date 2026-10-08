import { Action, ActionPanel, confirmAlert, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import AddAction, { EditAction } from "./add-action";
import { dataFilePath, deleteAction, readData } from "./utils";

export default function ListActions() {
  const { push, pop } = useNavigation();
  const [data, setData] = useState(readData());
  const actions = data.actions;

  const refreshData = () => setData(readData());

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Action",
      message: `Are you sure you want to delete "${name}"?`,
      primaryAction: { title: "Delete" },
    });
    if (confirmed) {
      deleteAction(id);
      refreshData();
    }
  };

  const addActionAction = (
    <Action
      icon={Icon.Plus}
      title="Add Action"
      onAction={() =>
        push(
          <AddAction
            afterUpdate={() => {
              refreshData();
              pop();
            }}
          />,
        )
      }
    />
  );

  return (
    <List>
      {actions.map((action) => (
        <List.Item
          key={action.id}
          icon={Icon.Code}
          title={action.name}
          subtitle={action.code.length > 50 ? `${action.code.substring(0, 50)}...` : action.code}
          accessories={
            action.shortcut && "modifiers" in action.shortcut
              ? [
                  {
                    text: `${action.shortcut.modifiers
                      .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
                      .join("+")}+${action.shortcut.key.toUpperCase()}`,
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Pencil}
                title="Edit Action"
                onAction={() =>
                  push(
                    <EditAction
                      id={action.id}
                      afterUpdate={() => {
                        refreshData();
                        pop();
                      }}
                    />,
                  )
                }
              />
              {addActionAction}
              <Action
                icon={Icon.Trash}
                title="Delete Action"
                onAction={() => handleDelete(action.id, action.name)}
                style={Action.Style.Destructive}
              />
              <Action.OpenWith title="Open Config in Editor" path={dataFilePath} />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No actions found" actions={<ActionPanel>{addActionAction}</ActionPanel>} />
    </List>
  );
}
