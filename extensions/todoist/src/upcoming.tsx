import { render } from "@raycast/api";
import useSWR from "swr";
import TaskList from "./components/TaskList";
import { getSectionsWithDueDates } from "./utils";
import { handleError, todoist } from "./api";
import { SWRKeys } from "./types";

function Upcoming(): JSX.Element {
  const { data, error } = useSWR(SWRKeys.tasks, () => todoist.getTasks({ filter: "view all" }));

  if (error) {
    handleError({ error, title: "Unable to get tasks" });
  }

  const tasks = data?.filter((task) => task.due?.date) || [];
  const sections = getSectionsWithDueDates(tasks);

  return <TaskList sections={sections} isLoading={!data && !error} />;
}

render(<Upcoming />);
