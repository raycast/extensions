import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { filterTasks } from "./api/tasks";
import { TaskItem } from "./components/TaskItem";
import { Filter, Project } from "./types/ticktick";

function FilterTasks({
  filter,
  projects,
  onRevalidate,
}: {
  filter: Filter;
  projects: Project[];
  onRevalidate: () => void;
}) {
  const {
    data: tasks = [],
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (rule?: string) => {
      if (!rule) return [];
      return filterTasks(rule);
    },
    [filter.rule],
  );

  const projectMap = new Map(projects.map((project) => [project.id, project.name]));
  const refresh = () => {
    onRevalidate();
    revalidate();
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={filter.name.length > 32 ? `${filter.name.slice(0, 29)}…` : filter.name}
      searchBarPlaceholder={`Search ${filter.name} tasks...`}
    >
      <List.Section title={filter.name}>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            projects={projects}
            projectName={projectMap.get(task.projectId)}
            onComplete={refresh}
            onDelete={refresh}
            onRevalidate={refresh}
          />
        ))}
      </List.Section>
      {tasks.length === 0 && !isLoading && <List.EmptyView icon={Icon.Checkmark} title="No matching tasks" />}
    </List>
  );
}

export default function Filters() {
  useAlerts();
  const { data, isLoading, revalidate } = useSync();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search smart lists...">
      {data.filters.length === 0 && !isLoading ? (
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
                  <Action.Push
                    title="Open Smart List"
                    icon={Icon.ArrowRight}
                    target={<FilterTasks filter={filter} projects={data.projects} onRevalidate={revalidate} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
