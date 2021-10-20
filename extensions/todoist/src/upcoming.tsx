import { render } from "@raycast/api";
import TaskList from "./components/TaskList";
import { Task } from "./types";
import { useFetch } from "./api";
import { compareAsc } from "date-fns";
import { displayDueDate } from "./utils";

function Upcoming(): JSX.Element {
  const path = "/tasks?filter=view all";
  const { data, isLoading } = useFetch<Task[]>(path);

  const tasks = data?.filter((task) => task.due?.date) || [];
  const allDueDates = [...new Set(tasks.map((task) => task.due?.date))] as string[];
  allDueDates.sort((dateA, dateB) => compareAsc(new Date(dateA), new Date(dateB)));

  const sections = allDueDates.map((date) => ({
    name: displayDueDate(date),
    tasks: tasks?.filter((task) => task.due?.date === date) || [],
  }));

  return <TaskList path={path} sections={sections} isLoading={isLoading} />;
}

render(<Upcoming />);
