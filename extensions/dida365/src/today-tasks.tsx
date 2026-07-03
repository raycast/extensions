import { useMemo, useState } from "react";
import { SetupTokenView } from "./components/setup-token-view.js";
import { TaskGroupList } from "./components/task-group-list.js";
import { useOpenTasks } from "./hooks/use-open-tasks.js";
import { useTaskActions } from "./hooks/use-task-actions.js";
import { isTodayTask } from "./utils/task-dates.js";
import { filterTasksBySearch, groupTasksByProject, openTasksOnly } from "./utils/task.js";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { tasks, setTasks, isLoading, needsSetup } = useOpenTasks({
    loadErrorTitle: "Failed to load today's tasks",
    filterTasks: openTasksOnly,
  });
  const { handleComplete, handleUpdateChecklistItem } = useTaskActions(setTasks);

  const todayTasks = useMemo(() => {
    const filtered = tasks.filter((task) => isTodayTask(task));
    return filterTasksBySearch(filtered, searchText);
  }, [searchText, tasks]);

  const taskGroups = useMemo(() => groupTasksByProject(todayTasks), [todayTasks]);

  if (needsSetup) {
    return <SetupTokenView />;
  }

  return (
    <TaskGroupList
      isLoading={isLoading}
      searchBarPlaceholder="Search today's tasks..."
      onSearchTextChange={setSearchText}
      taskGroups={taskGroups}
      onComplete={handleComplete}
      onUpdateChecklistItem={handleUpdateChecklistItem}
    />
  );
}
