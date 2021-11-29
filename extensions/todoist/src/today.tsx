import { render } from "@raycast/api";
import { useFetch } from "./api";
import { Task } from "./types";
import { partitionTasksWithOverdue, showApiToastError } from "./utils";

import TaskList from "./components/TaskList";

function Today() {
  const path = "/tasks?filter=today|overdue";
  const { data: tasks, isLoading: isLoadingTasks, error } = useFetch<Task[]>(path);

  if (error) {
    showApiToastError({ error, title: "Failed to get tasks", message: error.message });
  }

  const [overdue, today] = partitionTasksWithOverdue(tasks || []);

  const sections = [{ name: "Today", tasks: today }];

  if (overdue.length > 0) {
    sections.unshift({
      name: "Overdue",
      tasks: overdue,
    });
  }

  return <TaskList path={path} sections={sections} isLoading={isLoadingTasks} />;
}

render(<Today />);
