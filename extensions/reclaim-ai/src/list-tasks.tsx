import { List } from "@raycast/api";
import { useTask } from "./hooks/useTask";
import { Task } from "./types/task";
import { useEffect, useMemo, useState } from "react";

const TaskList = () => {
  // const { data } = useTask().getAllTasks();
  // const tasks = data;
  
  const { getAllTasks } = useTask();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const tasks = await getAllTasks();
        setTasks(tasks);
      } catch (error) {
        console.error("Error loading tasks", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [getAllTasks]);

  return (
    <List
    isLoading={isLoading}
    >
      {tasks?.map((task: Task) => (
        <List.Item key={task.id} title={task.title} subtitle={task.status} />
      ))}
    </List>
  );
};

export default function Command() {
  return (
    <TaskList />
  );
}
