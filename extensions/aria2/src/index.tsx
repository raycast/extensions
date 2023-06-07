import { useState, useEffect, useMemo, useCallback } from "react";
import TasksList from "./components/TasksList";
import useAria2 from "./hooks/useAria2";
import { Task, Filter } from "./types";

export default function Command() {
  const { fetchTasks, isConnected } = useAria2();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>(Filter.All);
  const [isLoading, setIsLoading] = useState(true);

  const filterTasks = useCallback(
    (filter: Filter): Task[] => {
      return tasks.filter((task) => {
        if (filter === Filter.Active) {
          return task.status === "active";
        } else if (filter === Filter.Waiting) {
          return task.status === "waiting";
        } else if (filter === Filter.CompletePaused) {
          return ["complete", "paused"].includes(task.status);
        } else {
          return true;
        }
      });
    },
    [tasks]
  );

  useEffect(() => {
    if (isConnected) {
      const fetchData = async () => {
        setIsLoading(true);
        const tasks = await fetchTasks();
        setTasks(tasks);
        console.log(tasks);
        setIsLoading(false);
      };
      fetchData();
    }
  }, [fetchTasks, isConnected]);

  const filteredTasks = useMemo(() => filterTasks(filter), [filter, filterTasks]);

  const handleFilterChange = useCallback((filter: Filter) => {
    setFilter(filter);
  }, []);

  return <TasksList isLoading={isLoading} tasks={filteredTasks} onFilterChange={handleFilterChange} />;
}
