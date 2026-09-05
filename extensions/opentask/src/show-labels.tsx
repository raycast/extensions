import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { Label, getLabelUrl } from "./api";
import TaskListSections from "./components/TaskListSections";
import { colorHex } from "./helpers/colors";
import { todayIn } from "./helpers/dates";
import { groupByDates } from "./helpers/groupBy";
import { useLabels, useOpenTasks, useProjects, useUserSettings } from "./hooks/useData";

function LabelTasks({ label }: { label: Label }) {
  const { data: tasks, isLoading, mutate } = useOpenTasks();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();

  const today = todayIn(settings?.timezone);
  const labelTasks = tasks?.filter((task) => task.labels.includes(label.name)) ?? [];

  return (
    <List navigationTitle={label.name} searchBarPlaceholder="Filter tasks" isLoading={isLoading}>
      <TaskListSections
        sections={groupByDates(labelTasks, today)}
        today={today}
        mutate={mutate}
        projects={projects}
        timeFormat={settings?.timeFormat}
      />
      <List.EmptyView icon={Icon.Tag} title="No open tasks" description="No open tasks carry this label." />
    </List>
  );
}

export default function ShowLabels() {
  const { data: labels, isLoading, mutate } = useLabels();
  const { data: tasks } = useOpenTasks();

  const sorted = [...(labels ?? [])].sort((a, b) => a.item_order - b.item_order);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter labels">
      {sorted.map((label) => {
        const count = tasks?.filter((task) => task.labels.includes(label.name)).length;
        return (
          <List.Item
            key={label.id}
            title={label.name}
            icon={{ source: Icon.Tag, tintColor: colorHex(label.color) }}
            subtitle={count !== undefined ? `${count} ${count === 1 ? "task" : "tasks"}` : undefined}
            accessories={label.is_favorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []}
            actions={
              <ActionPanel>
                <Action.Push title="Show Tasks" icon={Icon.List} target={<LabelTasks label={label} />} />
                <Action.OpenInBrowser
                  title="Open in OpenTask"
                  url={getLabelUrl(label.id)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action
                  title="Refresh Data"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => mutate()}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView icon={Icon.Tag} title="No labels" description="Create labels in OpenTask first." />
    </List>
  );
}
