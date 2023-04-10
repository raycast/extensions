import { Project, Task } from "@doist/todoist-api-typescript";
import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { ViewMode } from "../constants";
import { GroupByProp, SectionWithTasks } from "../helpers/groupBy";

import TaskListItem from "./TaskListItem";

interface TaskListProps {
  sections: SectionWithTasks[];
  isLoading: boolean;
  mode?: ViewMode;
  projects?: Project[];
  groupBy?: GroupByProp;
  mutateTasks: MutatePromise<Task[] | undefined>;
}

function TaskList({
  isLoading,
  sections,
  mode = ViewMode.date,
  projects,
  groupBy,
  mutateTasks,
}: TaskListProps): JSX.Element {
  const placeholder = `Filter tasks by name${
    mode === ViewMode.date ? ", priority (e.g p1), or project name (e.g Work)" : " or priority (e.g p1)"
  }`;

  return (
    <List searchBarPlaceholder={placeholder} isLoading={isLoading}>
      {sections.map((section, index) => {
        const subtitle = `${section.tasks.length} ${section.tasks.length === 1 ? "task" : "tasks"}`;

        return (
          <List.Section title={section.name} subtitle={subtitle} key={index}>
            {section.tasks.map((task) => {
              return (
                <TaskListItem
                  key={task.id}
                  task={task}
                  mode={mode}
                  groupBy={groupBy}
                  mutateTasks={mutateTasks}
                  {...(projects ? { projects } : {})}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

export default TaskList;
