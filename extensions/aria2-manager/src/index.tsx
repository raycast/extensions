import { useState, useEffect, useMemo, useCallback } from "react";
import { TasksList } from "./components";
import useAria2 from "./hooks/useAria2";
import { Task, Filter } from "./types";

export default function Command() {
  const { fetchTasks, isConnected, handleNotification } = useAria2();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>(Filter.All);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isConnected) {
      const fetchData = async () => {
        setIsLoading(true);
        const tasks = await fetchTasks();
        setTasks(tasks);
        setIsLoading(false);
      };
      fetchData();
    }
  }, [fetchTasks, isConnected]);

  useEffect(() => {
    if (isConnected) {
      handleNotification((notification) => {
        // 处理接收到的 Aria2 通知事件
        console.log("Received Aria2 notification:", notification);
        fetchData(); // 更新任务列表
      });
    }
  }, [handleNotification, isConnected]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const tasks = await fetchTasks();
    setTasks(tasks);
    setIsLoading(false);
  }, [fetchTasks]);

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

  const filteredTasks = useMemo(() => filterTasks(filter), [filter, filterTasks]);

  const handleFilterChange = useCallback((filter: Filter) => {
    setFilter(filter);
  }, []);

  const handleActionSuccess = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return (
    <TasksList
      isLoading={isLoading}
      tasks={filteredTasks}
      onFilterChange={handleFilterChange}
      onActionSuccess={handleActionSuccess}
    />
  );
}
