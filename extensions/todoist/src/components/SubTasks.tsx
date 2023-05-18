import { List, useNavigation } from "@raycast/api";
import { useEffect, useMemo } from "react";

import { Task } from "../api";
import useCachedData from "../hooks/useCachedData";

import TaskListItem from "./TaskListItem";

export default function SubTasks({ parentTask }: { parentTask: Task }) {
  const { pop } = useNavigation();
  const [data] = useCachedData();

  const subTasks = useMemo(() => data?.items.filter((item) => item.parent_id === parentTask.id) || [], [data]);

  // Pop to the previous screen if there are no sub-tasks left
  useEffect(() => {
    if (subTasks.length === 0) {
      pop();
    }
  }, [subTasks]);

  return (
    <List navigationTitle={`"${parentTask.content}" sub-tasks`}>
      {subTasks.map((task) => {
        return <TaskListItem key={task.id} task={task} />;
      })}
    </List>
  );
}
