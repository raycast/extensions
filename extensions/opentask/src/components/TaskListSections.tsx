import { List } from "@raycast/api";
import { Project } from "../api";
import { SectionWithTasks } from "../helpers/groupBy";
import TaskListItem from "./TaskListItem";

type TaskListSectionsProps = {
  sections: SectionWithTasks[];
  today: string;
  mutate: () => Promise<unknown>;
  projects?: Project[];
  showProject?: boolean;
  timeFormat?: "12h" | "24h";
};

export default function TaskListSections({
  sections,
  today,
  mutate,
  projects,
  showProject,
  timeFormat,
}: TaskListSectionsProps) {
  return (
    <>
      {sections.map((section) => (
        <List.Section
          key={section.name}
          title={section.name}
          subtitle={`${section.tasks.length} ${section.tasks.length === 1 ? "task" : "tasks"}`}
        >
          {section.tasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              today={today}
              mutate={mutate}
              projects={projects}
              showProject={showProject}
              timeFormat={timeFormat}
            />
          ))}
        </List.Section>
      ))}
    </>
  );
}
