import { List, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import { listPerspectives } from "./lib/api/list-perspectives";
import { listPerspectiveTasks } from "./lib/api/list-perspectives-tasks";
import { TaskList } from "./lib/components/task-list";
import { ValidateRequirements } from "./lib/components/with-requirements";
import { GroupBy } from "./lib/components/task-list";

type ViewMode = {
  perspective: string;
  groupBy: GroupBy;
};

const isValidGroupBy = (value: string | undefined): value is GroupBy => {
  return value === "none" || value === "project" || value === "tags" || value === "priority";
};

export default function PerspectivesCommand() {
  const preferences = getPreferenceValues();

  // Initialize view mode with preferences but maintain state during session
  const [viewMode, setViewMode] = useState<ViewMode>({
    perspective: preferences.defaultPerspective || "Inbox",
    groupBy: preferences.defaultGrouping || "none",
  });

  const {
    isLoading: perspectiveLoading,
    data: perspectives,
    error: perspectiveError,
  } = usePromise(() => listPerspectives());

  const listPerspectiveTasksMemo = useCallback((name: string) => listPerspectiveTasks(name), []);

  const {
    isLoading,
    data,
    revalidate,
    error: taskError,
  } = usePromise(listPerspectiveTasksMemo, [viewMode.perspective]);

  if (perspectiveError || taskError) {
    return (
      <List>
        <List.EmptyView title="Cannot get your perspectives or the associated tasks" />
      </List>
    );
  }

  const customNames = perspectives?.customPerspectives.map((p) => p.name);
  const builtInNames = perspectives?.names.filter((name) => !customNames?.includes(name));

  const handleViewChange = (value: string) => {
    if (value.startsWith("group:")) {
      // Update only grouping, maintain current perspective
      const newGroupBy = value.replace("group:", "");
      if (isValidGroupBy(newGroupBy)) {
        setViewMode((current) => ({
          ...current,
          groupBy: newGroupBy,
        }));
      }
    } else {
      // Update only perspective, maintain current grouping
      setViewMode((current) => ({
        ...current,
        perspective: value,
      }));
    }
  };

  const getDropdownValue = () => {
    if (viewMode.groupBy !== "none") {
      return `group:${viewMode.groupBy}`;
    }
    return viewMode.perspective;
  };

  return (
    <ValidateRequirements>
      <TaskList
        isLoading={perspectiveLoading || isLoading}
        tasks={data}
        title={viewMode.groupBy === "none" ? viewMode.perspective : `${viewMode.perspective} (${viewMode.groupBy})`}
        onTaskUpdated={async () => {
          await revalidate();
        }}
        isShowingDetail={preferences.showDetailsByDefault}
        groupBy={viewMode.groupBy}
        searchBarAccessory={
          <List.Dropdown tooltip="View Options" onChange={handleViewChange} defaultValue={getDropdownValue()}>
            <List.Dropdown.Section title="Built-in Perspectives">
              {builtInNames?.map((n) => <List.Dropdown.Item key={n} title={n} value={n} />)}
            </List.Dropdown.Section>

            <List.Dropdown.Section title="Custom Perspectives">
              {perspectives?.customPerspectives.map((p) => (
                <List.Dropdown.Item key={p.id} title={p.name} value={p.name} />
              ))}
            </List.Dropdown.Section>

            <List.Dropdown.Section title="Group Current View">
              <List.Dropdown.Item title="No Grouping" value="group:none" />
              <List.Dropdown.Item title="By Project" value="group:project" />
              <List.Dropdown.Item title="By Tags" value="group:tags" />
              <List.Dropdown.Item title="By Priority" value="group:priority" />
            </List.Dropdown.Section>
          </List.Dropdown>
        }
      />
    </ValidateRequirements>
  );
}
