import { useMemo, useState } from "react";
import { SetupTokenView } from "./components/setup-token-view.js";
import { TaskGroupList } from "./components/task-group-list.js";
import { useOpenTasks } from "./hooks/use-open-tasks.js";
import { useTaskActions } from "./hooks/use-task-actions.js";
import { filterTasksBySearch, groupTasksByProject, openTasksOnly } from "./utils/task.js";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { tasks, setTasks, isLoading, needsSetup, loadTasks } = useOpenTasks({
    loadErrorTitle: "Failed to load tasks",
  });
  const { handleComplete, handleUpdateChecklistItem } = useTaskActions(setTasks);

  const filteredTasks = useMemo(() => {
    return filterTasksBySearch(openTasksOnly(tasks), searchText);
  }, [searchText, tasks]);

  const taskGroups = useMemo(() => groupTasksByProject(filteredTasks), [filteredTasks]);

  if (needsSetup) {
    return <SetupTokenView />;
  }

  return (
    <TaskGroupList
      isLoading={isLoading}
      searchBarPlaceholder="Search Dida365 tasks..."
      onSearchTextChange={setSearchText}
      taskGroups={taskGroups}
      onComplete={handleComplete}
      onUpdateChecklistItem={handleUpdateChecklistItem}
      onRefresh={loadTasks}
    />
  );
}
