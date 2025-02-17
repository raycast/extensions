import { List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { listPerspectives } from "./lib/api/list-perspectives";
import { listPerspectiveTasks } from "./lib/api/list-perspectives-tasks";
import { TaskList } from "./lib/components/task-list";
import { ValidateRequirements } from "./lib/components/with-requirements";

export default function PerspectivesCommand() {
  const [perspective, setPerspective] = useState<string>("Inbox");
  const {
    isLoading: perspectiveLoading,
    data: perspectives,
    error: perspectiveError,
  } = usePromise(() => listPerspectives());
  const {
    isLoading,
    data,
    revalidate,
    error: taskError,
  } = usePromise((name) => listPerspectiveTasks(name), [perspective]);

  if (perspectiveLoading) {
    return <List isLoading />;
  }

  if (perspectiveError || taskError) {
    showToast({
      title: "An error occurred",
      message: "Cannot get your perspectives or the associated tasks",
      style: Toast.Style.Failure,
    });
    return (
      <List>
        <List.EmptyView title="Cannot get your perspectives or the associated tasks" />
      </List>
    );
  }

  const { customPerspectives, names } = perspectives!;

  const customNames = customPerspectives.map((p) => p.name);
  const builtInNames = names.filter((name) => !customNames.includes(name));

  return (
    <ValidateRequirements>
      <TaskList
        isLoading={isLoading}
        tasks={data}
        title={perspective}
        onTaskUpdated={revalidate}
        isShowingDetail
        searchBarAccessory={
          <List.Dropdown tooltip="Name of the perspective" onChange={setPerspective}>
            <List.Dropdown.Section title="Built-in perspectives">
              {builtInNames.map((n) => (
                <List.Dropdown.Item key={n} title={n} value={n} />
              ))}
            </List.Dropdown.Section>

            <List.Dropdown.Section title="Custom perspectives">
              {perspectives?.customPerspectives.map((p) => (
                <List.Dropdown.Item key={p.id} title={p.name} value={p.name} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        }
      />
    </ValidateRequirements>
  );
}
