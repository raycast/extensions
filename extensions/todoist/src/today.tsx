import { render } from "@raycast/api";
import useSWR from "swr";
import { partitionTasksWithOverdue } from "./utils";
import { todoist, handleError } from "./api";
import { SWRKeys } from "./types";
import TaskList from "./components/TaskList";

function Today() {
  const { data, error } = useSWR(SWRKeys.tasks, () => todoist.getTasks({ filter: "today|overdue" }));

  if (error) {
    handleError({ error, title: "Unable to get tasks" });
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
