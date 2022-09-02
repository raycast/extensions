import { getPreferenceValues, MenuBarExtra, open } from "@raycast/api";
import useSWR from "swr";
import { todoist } from "./api";
import { SWRKeys } from "./types";

const MAX_TASK_LENGTH = 45;

export default function TodayFrog() {
  const { data: tasks, error: getTasksError } = useSWR(SWRKeys.tasks, () =>
    todoist.getTasks({ filter: "today|overdue" })
  );
  const { data: labels, error: getLabelsError } = useSWR(SWRKeys.labels, () => todoist.getLabels());

  const preferences = getPreferenceValues();
  const frogLabel = labels?.find((label) => label.name === preferences.frogLabelName);
  const frogTask = tasks?.find((task) => frogLabel && task.labelIds.includes(frogLabel?.id));

  const getTitle = () => {
    if (frogTask) return "🐸 " + frogTask.content;
    if (tasks && tasks.length > 0) return tasks[0].content.substring(0, MAX_TASK_LENGTH);
    if (tasks && tasks.length === 0) return "🎉 No tasks left for today";

    return "Loading...";
  };

  return (
    <MenuBarExtra isLoading={!tasks && !getTasksError && !getLabelsError} title={getTitle()}>
      {tasks &&
        tasks.map((task) => <MenuBarExtra.Item key={task.id} title={task.content} onAction={() => open(task.url)} />)}
    </MenuBarExtra>
  );
}
