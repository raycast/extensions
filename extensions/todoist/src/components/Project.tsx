import TaskList from "./TaskList";
import { getTasks, getSections } from "../api";
import { ViewMode } from "../types";

interface ProjectProps {
  projectId: number;
}

function Project({ projectId }: ProjectProps): JSX.Element {
  const { data: rawTasks } = getTasks({ projectId: projectId });
  const { data: allSections } = getSections(projectId);

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
