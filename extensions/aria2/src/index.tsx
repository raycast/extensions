import { useState, useEffect } from "react";
import TasksList from "./components/TasksList";
import useAria2 from "./hooks/useAria2";
import { Task, Filter } from "./types";

type State = {
  isLoading: boolean;
  searchText: string;
  filter: Filter;
  tasks: Task[];
  visibleTasks: Task[];
};

export default function Command() {
  const { fetchTasks, isConnected } = useAria2();
  const [state, setState] = useState<State>({
    filter: Filter.All,
    isLoading: true,
    searchText: "",
    tasks: [],
    visibleTasks: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      if (isConnected) {
        const tasks = await fetchTasks();
        setState((prevState) => ({
          ...prevState,
          tasks,
          isLoading: false,
        }));
      }
    };

    fetchData();
  }, [fetchTasks, isConnected]);

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      visibleTasks: filterTasks(prevState.filter, prevState.tasks),
    }));
  }, [state.filter, state.tasks]);

  const filterTasks = (filter: Filter, tasks: Task[]): Task[] => {
    // 根据当前状态筛选并更新可见任务列表
    return tasks.filter((task) => {
      if (filter === Filter.Active) {
        return task.status === "active"; // 筛选正在下载的任务
      } else if (filter === Filter.Waiting) {
        return task.status === "waiting"; // 筛选正在等待的任务
      } else if (filter === Filter.CompletePaused) {
        return ["complete", "paused"].includes(task.status); // 筛选已完成/已停止的任务
      } else {
        return true;
      }
    });
  };

  const handleFilterChange = (filter: Filter) => {
    setState((prevState) => ({
      ...prevState,
      filter,
      visibleTasks: filterTasks(filter, prevState.tasks),
    }));
  };

  return <TasksList tasks={state.visibleTasks} onFilterChange={handleFilterChange} />;
}
