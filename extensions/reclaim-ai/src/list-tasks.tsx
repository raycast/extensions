import { Color, Icon, List } from "@raycast/api";
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
      const tasks = await getAllTasks();
      setTasks(tasks);
    };

    fetchTasks();
  }, [getAllTasks]);

  return (
    <List
    isLoading={isLoading}
    >
      {tasks?.map((task: Task) => (
        <List.Item 
          key={task.id} 
          title={task.title} 
          // subtitle={task.status}
          accessories={[
            { text: { value: task.status, color: Color.PrimaryText } },
            { tag: { value: (task.timeChunksRemaining / 4).toString() + "h", color: Color.Green }, tooltip: "Time remaining"},
            { tag: { value: new Date(task.due), color: Color.Red }, tooltip: "Due date" },
          ]}
          />
      ))}
    </List>
  );
};

export default function Command() {
  return (
    <TaskList />
  );
}
