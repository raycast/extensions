import { withAccessToken } from "@raycast/utils";
import { authorize } from "./api/oauth";
import { getPreferenceValues, List, Icon, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { filterTasks } from "./api/tasks";
import { TaskItem } from "./components/TaskItem";
import { useState } from "react";
import { useFirstRun } from "./lib/useFirstRun";

function Filters() {
  useFirstRun();
  useAlerts();
  const { data, isLoading: syncLoading, revalidate } = useSync();
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const {
    data: filteredTasks,
    isLoading: filterLoading,
    revalidate: refilter,
  } = useCachedPromise(
    async (filterId: string | null, filters: typeof data.filters) => {
      if (!filterId) return [];
      const filter = filters.find((f) => f.id === filterId);
      if (!filter?.rule) return [];
      return filterTasks(filter.rule);
    },
    [activeFilterId, data.filters]
  );

  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));
  const tasks = activeFilterId ? filteredTasks ?? [] : [];
  const isLoading = syncLoading || filterLoading;

  return (
    <List isLoading={isLoading} navigationTitle="Smart Lists" searchBarPlaceholder="Search filters...">
      {!activeFilterId ? (
        data.filters.length === 0 && !syncLoading ? (
          <List.EmptyView
            icon={Icon.Filter}
            title="No smart lists"
            description="Create filters in TickTick to see them here."
          />
        ) : (
          <List.Section title="Your Smart Lists">
            {data.filters.map((filter) => (
              <List.Item
                key={filter.id}
                icon={Icon.Filter}
                title={filter.name}
                subtitle={filter.rule}
                actions={
                  <ActionPanel>
                    <Action title="Open Filter" icon={Icon.ArrowRight} onAction={() => setActiveFilterId(filter.id)} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )
      ) : (
        <>
          <List.Section title={data.filters.find((f) => f.id === activeFilterId)?.name ?? "Filter"}>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                projects={data.projects}
                projectName={projectMap.get(task.projectId)}
                onComplete={() => {
                  revalidate();
                  refilter();
                }}
                onDelete={() => {
                  revalidate();
                  refilter();
                }}
                onRevalidate={() => {
                  revalidate();
                  refilter();
                }}
              />
            ))}
          </List.Section>
          {tasks.length === 0 && !isLoading && <List.EmptyView icon={Icon.Checkmark} title="No matching tasks" />}
        </>
      )}
    </List>
  );
}

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();
function APIRequired() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Lock}
        title="API Mode Required"
        description="Switch to API mode in TickTick extension preferences (Raycast Settings → Extensions → TickTick) to use this feature."
      />
    </List>
  );
}
export default integrationMode === "applescript" ? APIRequired : withAccessToken({ authorize })(Filters);
