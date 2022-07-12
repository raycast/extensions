import { List } from "@raycast/api";
import { Project } from "@doist/todoist-api-typescript";
import { SectionWithTasks, ViewMode } from "../types";
import TaskListItem from "./TaskListItem";

interface TaskListProps {
  sections: SectionWithTasks[];
  isLoading: boolean;
  mode?: ViewMode;
  projects?: Project[];
}

function TaskList({ isLoading, sections, mode = ViewMode.date, projects }: TaskListProps): JSX.Element {
  const placeholder = `Filter tasks by name${
    mode === ViewMode.date ? ", priority (e.g p1), or project name (e.g Work)" : " or priority (e.g p1)"
  }`;

  return (
    <List searchBarPlaceholder={placeholder} isLoading={isLoading}>
      {sections.map((section, index) => {
        const subtitle = `${section.tasks.length} ${section.tasks.length === 1 ? "task" : "tasks"}`;

        return (
          <List.Section title={section.name} subtitle={subtitle} key={index}>
            {section.tasks.map((task) => (
              <TaskListItem key={task.id} task={task} mode={mode} {...(projects ? { projects } : {})} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

export default TaskList;
