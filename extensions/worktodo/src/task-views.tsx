import { Icon, List } from "@raycast/api";
import { taskLifecycleActionKindForViewKind } from "./shared/application/task-lifecycle-interaction";
import type { TaskView } from "./shared/application/task-views";
import type { Label, Project } from "./shared/domain/model";
import {
  taskViewContent as sharedTaskViewContent,
  taskViewFromKey,
  taskViewKey,
} from "./shared/presentation/task-views";
import { taskLifecycleMutationActionPresentation } from "./task-lifecycle-raycast";

export { buildTaskViewSections, initialProjectIdForTaskView, taskViewKey } from "./shared/presentation/task-views";
export type { TaskListSection } from "./shared/presentation/task-views";

const VIEW_ICONS = {
  all: Icon.Folder,
  today: Icon.Calendar,
  thisWeek: Icon.Calendar,
  completed: Icon.CheckCircle,
  trash: Icon.Trash,
  project: Icon.Folder,
  label: Icon.Tag,
} as const;

export function taskViewContent(view: TaskView, projects: readonly Project[], labels: readonly Label[]) {
  return {
    ...sharedTaskViewContent(view, projects, labels),
    icon: VIEW_ICONS[view.kind],
    taskIcon: view.kind === "completed" ? Icon.CheckCircle : view.kind === "trash" ? Icon.Trash : Icon.Circle,
  };
}

export function lifecycleActionForTaskView(view: TaskView) {
  const kind = taskLifecycleActionKindForViewKind(view.kind);
  return { kind, ...taskLifecycleMutationActionPresentation(kind) };
}

export function TaskViewDropdown({
  view,
  projects,
  labels,
  onChange,
}: {
  view: TaskView;
  projects: readonly Project[];
  labels: readonly Label[];
  onChange: (view: TaskView) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Task view"
      value={taskViewKey(view)}
      onChange={(value) => onChange(taskViewFromKey(value, projects, labels))}
    >
      <List.Dropdown.Section title="Views">
        <List.Dropdown.Item value="all" title="All tasks" icon={Icon.Folder} />
        <List.Dropdown.Item value="today" title="Today" icon={Icon.Calendar} />
        <List.Dropdown.Item value="thisWeek" title="This week" icon={Icon.Calendar} />
      </List.Dropdown.Section>
      {projects.length > 0 ? (
        <List.Dropdown.Section title="Projects">
          {projects.map((project) => (
            <List.Dropdown.Item
              key={project.id}
              value={`project:${project.id}`}
              title={project.name}
              icon={Icon.Folder}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
      <List.Dropdown.Section title="Status">
        <List.Dropdown.Item value="completed" title="Completed" icon={Icon.CheckCircle} />
        <List.Dropdown.Item value="trash" title="Trash" icon={Icon.Trash} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
