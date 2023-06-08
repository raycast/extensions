import { useState, useEffect, useMemo, useCallback } from "react";
import { TasksList } from "./components";
import useAria2 from "./hooks/useAria2";
import { Task, Filter, Status } from "./types";

const REFRESH_INTERVAL = 1000;

export default function Command() {
  const { fetchTasks, isConnected, handleNotification } = useAria2();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>(Filter.All);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const tasks = await fetchTasks();
    setTasks(tasks);
    setIsLoading(false);
  }, [fetchTasks]);

  useEffect(() => {
    if (isConnected) {
      const fetchDataAndSetTasks = async () => {
        await fetchData();
      };
      fetchDataAndSetTasks();
    }
  }, [fetchData, isConnected]);

  useEffect(() => {
    if (isConnected) {
      handleNotification((notification) => {
        console.log("Received Aria2 notification:", notification);
        fetchData();
      });
    }
  }, [handleNotification, isConnected, fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
      const hasActiveTasks = tasks.some((task) => task.status === "active" && parseFloat(task.progress) < 100);
      if (hasActiveTasks) {
        fetchData();
      }
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(timer);
    };
  }, [fetchData, tasks]);

  const filterTasks = useCallback(
    (filter: Filter): Task[] => {
      return tasks.filter((task) => {
        if (filter === Filter.Active) {
          return task.status === Status.Active;
        } else if (filter === Filter.Waiting) {
          return task.status === Status.Waiting || task.status === Status.Paused;
        } else if (filter === Filter.Complete) {
          return task.status === Status.Complete;
        } else {
          return true;
        }
      });
    },
    [tasks]
  );

  const filteredTasks = useMemo(() => filterTasks(filter), [filter, filterTasks]);

  const handleFilterChange = useCallback((filter: Filter) => {
    setFilter(filter);
  }, []);

  return <TasksList isLoading={isLoading} tasks={filteredTasks} onFilterChange={handleFilterChange} />;
}
