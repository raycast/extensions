import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useState } from "react";
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

  const listPerspectiveTasksMemo = useCallback((name: string) => listPerspectiveTasks(name), []);

  const { isLoading, data, revalidate, error: taskError } = usePromise(listPerspectiveTasksMemo, [perspective]);

  if (perspectiveError || taskError) {
    return (
      <List>
        <List.EmptyView title="Cannot get your perspectives or the associated tasks" />
      </List>
    );
  }

  const customNames = perspectives?.customPerspectives.map((p) => p.name);
  const builtInNames = perspectives?.names.filter((name) => !customNames?.includes(name));

  return (
    <ValidateRequirements>
      <TaskList
        isLoading={perspectiveLoading || isLoading}
        tasks={data}
        title={perspective}
        onTaskUpdated={async () => await revalidate()}
        isShowingDetail
        searchBarAccessory={
          <List.Dropdown tooltip="Name of the perspective" onChange={setPerspective} defaultValue="Inbox">
            <List.Dropdown.Section title="Built-in perspectives">
              {builtInNames?.map((n) => <List.Dropdown.Item key={n} title={n} value={n} />)}
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
