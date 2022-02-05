import { render } from "@raycast/api";
import { partitionTasksWithOverdue } from "./utils";
import { getTasks, handleError } from "./api";

import TaskList from "./components/TaskList";

function Today() {
  const { data, error } = getTasks({ filter: "today|overdue" });

  if (error) {
    handleError({ error, title: "Failed to get tasks" });
  }

  const [overdue, today] = partitionTasksWithOverdue(data || []);

  const sections = [{ name: "Today", tasks: today }];

  if (overdue.length > 0) {
    sections.unshift({
      name: "Overdue",
      tasks: overdue,
    });
  }

  return <TaskList sections={sections} isLoading={!data && !error} />;
}

render(<Today />);
