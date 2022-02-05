import { render } from "@raycast/api";
import { compareAsc } from "date-fns";
import useSWR from "swr";
import TaskList from "./components/TaskList";
import { displayDueDate, partitionTasksWithOverdue } from "./utils";
import { handleError, todoist } from "./api";
import { SWRKeys } from "./types";

function Upcoming(): JSX.Element {
  const { data, error } = useSWR(SWRKeys.tasks, () => todoist.getTasks({ filter: "view all" }));

  if (error) {
    handleError({ error, title: "Unable to get tasks" });
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

  return <TaskList sections={sections} isLoading={!data && !error} />;
}

render(<Upcoming />);
