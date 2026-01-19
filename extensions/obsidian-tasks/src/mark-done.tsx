import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Task } from "./types";
import { getPreferenceValues } from "@raycast/api";
import { useTasks } from "./hooks/useTasks";
import { TaskItem } from "./components/TaskItem";

export default function Command() {
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  const { allTasks, isLoading, handleMarkDone } = useTasks(preferences);

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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks to mark as done..."
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      <List.Section title="Tasks" subtitle={filteredTasks.length.toString()}>
        {filteredTasks.map((task) => (
          <TaskItem key={task.id} task={task} onMarkDone={handleMarkDone} showActions={true} />
        ))}
      </List.Section>
    </List>
  );
}
