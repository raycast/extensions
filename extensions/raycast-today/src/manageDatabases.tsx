import React from "react";
import { Action, ActionPanel, Alert, Icon, List, confirmAlert } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { notionService } from "./utils/authNotion";
import { openNotionUrl } from "./utils";
import { withStoreProvider } from "./components/StoreProvider";
import { useDatabases } from "@today/common";

const ManageDatabases = () => {
  const { orderedDatabases, deleteDatabase, moveBy } = useDatabases();

  const onOpen = React.useCallback((url: string) => async () => openNotionUrl(url), []);

  const onDelete = React.useCallback(
    (databaseId: string) => async () => {
      const confirmed = await confirmAlert({
        icon: Icon.Trash,
        title: "Remove this database from workspace?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      deleteDatabase(databaseId);
    },
    [deleteDatabase],
  );

  return (
    <List>
      {orderedDatabases.map((database) => (
        <List.Item
          key={database.id}
          id={database.id}
          title={database.title}
          icon={database.icon ? { value: database.icon, tooltip: "" } : undefined}
          actions={
            <ActionPanel>
              <Action
                title="Open in Notion"
                icon="notion-logo.png"
                shortcut={{ key: "o", modifiers: ["cmd"] }}
                onAction={onOpen(database.url)}
              />
              <Action.Open
                title="Add New Database"
                icon={Icon.PlusCircle}
                shortcut={{ key: "n", modifiers: ["cmd"] }}
                target="raycast://extensions/julienR2/raycast-today/addDatabase"
              />
              {database.position !== 0 && (
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={{ key: "arrowUp", modifiers: ["cmd", "shift"] }}
                  onAction={moveBy(database.id, -1)}
                />
              )}
              {database.position !== orderedDatabases.length - 1 && (
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ key: "arrowDown", modifiers: ["cmd", "shift"] }}
                  onAction={moveBy(database.id, 1)}
                />
              )}
              <Action
                title="Delete"
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                shortcut={{ key: "backspace", modifiers: ["cmd"] }}
                onAction={onDelete(database.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default withStoreProvider(withAccessToken(notionService)(ManageDatabases));
