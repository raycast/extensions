import { render } from "@raycast/api";
import TaskList from "./components/TaskList";
import { Task } from "./types";
import { useFetch } from "./api";
import { compareAsc } from "date-fns";
import { displayDueDate, partitionTasksWithOverdue, showApiToastError } from "./utils";

function Upcoming(): JSX.Element {
  const path = "/tasks?filter=view all";
  const { data, isLoading, error } = useFetch<Task[]>(path);

  if (error) {
    showApiToastError({ error, title: "Failed to get tasks", message: error.message });
  }

  const tasks = data?.filter((task) => task.due?.date) || [];

  const [overdue, upcoming] = partitionTasksWithOverdue(tasks);

  const allDueDates = [...new Set(upcoming.map((task) => task.due?.date))] as string[];
  allDueDates.sort((dateA, dateB) => compareAsc(new Date(dateA), new Date(dateB)));

  const sections = allDueDates.map((date) => ({
    name: displayDueDate(date),
    tasks: upcoming?.filter((task) => task.due?.date === date) || [],
  }));

  if (overdue.length > 0) {
    sections.unshift({
      name: "Overdue",
      tasks: overdue,
    });
  }

  return <TaskList path={path} sections={sections} isLoading={isLoading} />;
}

render(<Upcoming />);
