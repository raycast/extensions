import { Action, ActionPanel, Alert, confirmAlert, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import EditActionForm from "./edit-action-form";
import { Entry } from "./types";

export default function Command() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    Promise.resolve(LocalStorage.getItem("entries")).then((entriesString) => {
      setEntries(JSON.parse((entriesString || "[]") as string));
    });
  }, []);

  const listItems = entries.map((entry) => {
    const numActions = entry.addActions.length + entry.removeActions.length;
    return (
      <List.Item
        key={entry.dir}
        title={entry.dir}
        subtitle={`${numActions} action${numActions == 1 ? "" : "s"}`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Edit Actions"
              icon={Icon.Pencil}
              target={<EditActionForm oldData={entry} setEntries={setEntries} />}
            />
            <Action
              title="Delete Folder Action"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Folder Action",
                    message: "Are you sure?",
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  const newEntries = entries.filter((otherEntry) => entry.dir != otherEntry.dir);
                  setEntries(newEntries);
                  await LocalStorage.setItem("entries", JSON.stringify(newEntries));
                  await LocalStorage.removeItem(`dir-${entry.dir}`);
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  });

  return <List>{listItems}</List>;
}
