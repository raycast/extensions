import { render } from "@raycast/api";
import { useFetch } from "./api";
import { Task } from "./types";

import TaskList from "./components/TaskList";

function Today() {
  const path = "/tasks?filter=today";
  const { data: tasks, isLoading: isLoadingTasks } = useFetch<Task[]>(path);

  const sections = [{ name: "Today", tasks: tasks || [] }];

  return <TaskList path={path} sections={sections} isLoading={isLoadingTasks} />;
}

render(<Today />);
