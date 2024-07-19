import React from "react";
import { ActionPanel, Color, Icon, List } from "@raycast/api";

import { Task } from "@today/common/types";
import { trimString } from "../../utils";
import { ICONS } from "./constants";
import { TaskActions } from "./TaskActions";
import { useDatabases } from "@today/common";

type Props = {
  task: Task;
  actions?: React.ReactNode;
};

export const TaskItem = ({ task, actions }: Props) => {
  const { databases = {} } = useDatabases();

  const database = task.databaseId ? databases[task.databaseId] : null;

  const title = React.useMemo(() => {
    let emoji = "";

    if (task.icon?.type === "emoji") {
      emoji = task.icon.emoji + "  ";
    }

    return emoji + task.title;
  }, [task]);

  const accessories = React.useMemo<List.Item.Accessory[]>(() => {
    const dueDate = new Date(task.date?.start || "");
    const isDue = new Date(task.date?.start || "") < new Date();
    const color = isDue ? Color.Red : undefined;

    return [
      ...(task.date?.start
        ? [
            {
              date: { value: dueDate, color },
              icon: { source: Icon.Alarm, tintColor: color },
            } as List.Item.Accessory,
          ]
        : []),
      ...(task.status?.id ? [{ tag: { color: task.status?.color, value: task.status?.name } }] : []),
      ...(database ? [{ text: { value: trimString(database.displayTitle, 15) }, tooltip: database.displayTitle }] : []),
    ];
  }, [task, database]);

  return (
    <List.Item
      key={task.id || undefined}
      id={task.id || undefined}
      title={trimString(title, 60)}
      icon={task.statusGroup ? ICONS[task.statusGroup] : undefined}
      accessories={accessories}
      actions={<ActionPanel>{actions || (task && <TaskActions task={task} />)}</ActionPanel>}
    />
  );
};
