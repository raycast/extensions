import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Project, getSections } from "../api";
import { groupBySection } from "../helpers/groupBy";
import { todayIn } from "../helpers/dates";
import { useOpenTasks, useProjects, useUserSettings } from "../hooks/useData";
import TaskListItem from "./TaskListItem";
import TaskListSections from "./TaskListSections";

export default function ProjectTasks({ project }: { project: Project }) {
  const { data: tasks, isLoading, mutate } = useOpenTasks();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();
  const { data: sections, isLoading: isLoadingSections } = useCachedPromise(getSections, [project.id], {
    keepPreviousData: true,
  });

  const today = todayIn(settings?.timezone);
  const projectTasks = tasks?.filter((task) => task.project_id === project.id) ?? [];
  const grouped = groupBySection(projectTasks, sections ?? []);

  return (
    <List
      navigationTitle={project.is_inbox ? "Inbox" : project.name}
      searchBarPlaceholder="Filter tasks"
      isLoading={isLoading || isLoadingSections}
    >
      {grouped.unsectioned.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          today={today}
          mutate={mutate}
          projects={projects}
          showProject={false}
          timeFormat={settings?.timeFormat}
        />
      ))}
      <TaskListSections
        sections={grouped.sections}
        today={today}
        mutate={mutate}
        projects={projects}
        showProject={false}
        timeFormat={settings?.timeFormat}
      />
      <List.EmptyView title="No open tasks" description="This project has no open tasks." />
    </List>
  );
}
