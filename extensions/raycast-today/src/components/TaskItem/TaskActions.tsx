import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { Task } from "@today/common/types";
import React from "react";
import { openNotionUrl } from "../../utils";
import { find } from "lodash";
import { ICONS } from "./constants";
import { useDatabases, useTasks } from "@today/common";

type Props = {
  task: Task;
};

export const TaskActions = ({ task }: Props) => {
  const { databases = {} } = useDatabases();
  const { updateTask, deleteTask } = useTasks();

  const database = databases[task.databaseId];

  const onOpen = React.useCallback(async () => {
    openNotionUrl(task.url);
  }, [task.url]);

  const onDelete = React.useCallback(() => {
    deleteTask(task.id);
  }, [deleteTask, task]);

  const onSetStatus = React.useCallback(
    (optionId: string) => async () => {
      const toast = await showToast({
        title: "Updating task",
        style: Toast.Style.Animated,
      });

      try {
        updateTask({
          page_id: task.id,
          properties: {
            [database.statusProperty.name]: {
              status: {
                id: optionId,
              },
            },
          },
        });

        toast.title = "Task updated successfully";
        toast.style = Toast.Style.Success;
      } catch (error) {
        toast.title = "Something happened while updating the task";
        toast.style = Toast.Style.Failure;
      }
    },
    [task, database, updateTask],
  );

  return (
    <>
      <ActionPanel.Submenu title="Set Status" icon="status.svg" shortcut={{ key: "s", modifiers: ["cmd"] }}>
        {Object.values(database.statusGroups)
          .reverse()
          .map(({ id, option_ids, name }) => (
            <ActionPanel.Section title={name} key={id}>
              {option_ids.map((optionId) => {
                const option = find(database.statusProperty.status.options, { id: optionId });
                if (!option) return null;

                return (
                  <Action
                    key={optionId}
                    icon={{
                      ...ICONS[id],
                      tintColor: option.color !== "default" ? option.color : ICONS[id].tintColor,
                    }}
                    title={option.name || ""}
                    onAction={onSetStatus(option.id)}
                  />
                );
              })}
            </ActionPanel.Section>
          ))}
      </ActionPanel.Submenu>
      <Action
        title="Open in Notion"
        icon="notion-logo.png"
        shortcut={{ key: "o", modifiers: ["cmd"] }}
        onAction={onOpen}
      />
      <Action
        title="Delete"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ key: "x", modifiers: ["ctrl"] }}
        onAction={onDelete}
      />
    </>
  );
};
