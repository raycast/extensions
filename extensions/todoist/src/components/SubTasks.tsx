import { List, useNavigation } from "@raycast/api";
import { useEffect, useMemo } from "react";

import { Task } from "../api";
import { searchBarPlaceholder } from "../helpers/tasks";
import useCachedData from "../hooks/useCachedData";

import TaskListItem from "./TaskListItem";

export default function SubTasks({ parentTask }: { parentTask: Task }) {
  const { pop } = useNavigation();
  const [data, setData] = useCachedData();

  const subTasks = useMemo(
    () => data?.items.filter((item) => item.parent_id === parentTask.id) || [],
    [data, parentTask.id],
  );

  // Pop to the previous screen if there are no sub-tasks left
  useEffect(() => {
    if (subTasks.length === 0) {
      pop();
    }
  }, [subTasks, pop]);

  return (
    <List navigationTitle={`"${parentTask.content}" sub-tasks`} searchBarPlaceholder={searchBarPlaceholder}>
      {subTasks.map((task) => {
        return <TaskListItem key={task.id} task={task} data={data} setData={setData} />;
      })}
    </List>
  );
}
