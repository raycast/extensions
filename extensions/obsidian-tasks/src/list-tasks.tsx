import { List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { Task } from "./types";
import { EditTaskForm } from "./components/EditTaskForm";
import { TaskItem } from "./components/TaskItem";
import { useTasks } from "./hooks/useTasks";
import { getPreferenceValues } from "@raycast/api";

export default function Command() {
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  const { allTasks, isLoading, refreshTaskList, handleMarkDone, handleDeleteTask } =
    useTasks(preferences);

  useEffect(() => {
    if (searchText) {
      const filtered = allTasks.filter(
        (task) =>
          task.description.toLowerCase().includes(searchText.toLowerCase()) ||
          task.tags?.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase())) ||
          (task.recurrence && task.recurrence.toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredTasks(filtered);
    } else {
      setFilteredTasks(allTasks);
    }
  }, [searchText, allTasks]);

  const handleEditTask = (task: Task) => {
    push(<EditTaskForm task={task} onTaskUpdated={refreshTaskList} />);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      onSearchTextChange={setSearchText}
      filtering={false}
      isShowingDetail
    >
      <List.Section title="Tasks" subtitle={filteredTasks.length.toString()}>
        {filteredTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onMarkDone={handleMarkDone}
            onDelete={handleDeleteTask}
            onEdit={handleEditTask}
          />
        ))}
      </List.Section>
    </List>
  );
}
