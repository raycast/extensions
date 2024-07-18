import React from "react";
import { orderBy } from "lodash";
import { List } from "@raycast/api";

import { TaskItem } from "./TaskItem";
import { Task } from "@today/common/types";
import { useStore } from "@today/common/components/StoreContext";

type Props = {
  title: string;
  tasks?: Task[];
};

const getSubtitle = (length?: number) => (length ? `${length} task${length > 0 ? "s" : ""}` : "");

export const TasksList = ({ title, tasks }: Props) => {
  const { config = {} } = useStore();

  const orderedTasks = React.useMemo(
    () => orderBy(tasks, (task) => config[task.databaseId].position, "asc"),
    [tasks, config],
  );

  return (
    <List.Section title={title} subtitle={getSubtitle(tasks?.length)}>
      {orderedTasks?.map((task) => <TaskItem key={task.id} task={task} />)}
    </List.Section>
  );
};
