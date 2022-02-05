import TaskList from "./TaskList";
import useSWR from "swr";
import { ViewMode, SWRKeys } from "../types";
import { todoist } from "../api";

interface ProjectProps {
  projectId: number;
}

function Project({ projectId }: ProjectProps): JSX.Element {
  const { data: rawTasks } = useSWR(SWRKeys.tasks, () => todoist.getTasks({ projectId }));
  const { data: allSections } = useSWR(SWRKeys.sections, () => todoist.getSections(projectId));

  const tasks = rawTasks?.filter((task) => !task.parentId);

  const sections = [
    {
      name: "No section",
      order: 0,
      tasks: tasks?.filter((task) => task.sectionId === 0) || [],
    },
  ];

  if (allSections && allSections.length > 0) {
    sections.push(
      ...allSections.map((section) => ({
        name: section.name,
        order: section.order,
        tasks: tasks?.filter((task) => task.sectionId === section.id) || [],
      }))
    );
  }

  sections.sort((a, b) => a.order - b.order);

  return <TaskList mode={ViewMode.project} sections={sections} isLoading={!rawTasks || !allSections} />;
}

export default Project;
