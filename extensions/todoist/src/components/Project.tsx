import TaskList from "./TaskList";
import { Project as TProject, Section, Task, ViewMode } from "../types";
import { useFetch } from "../api";

interface ProjectProps {
  project: TProject;
}

function Project({ project }: ProjectProps): JSX.Element {
  const path = `/tasks?project_id=${project.id}`;
  const { data: tasks, isLoading: isLoadingTasks } = useFetch<Task[]>(path);
  const { data: allSections, isLoading: isLoadingSections } = useFetch<Section[]>(`/sections?project_id=${project.id}`);

  const sections = [
    {
      name: "No section",
      order: 0,
      tasks: tasks?.filter((task) => task.section_id === 0) || [],
    },
  ];

  if (allSections && allSections.length > 0) {
    sections.push(
      ...allSections.map((section) => ({
        name: section.name,
        order: section.order,
        tasks: tasks?.filter((task) => task.section_id === section.id) || [],
      }))
    );
  }

  sections.sort((a, b) => a.order - b.order);

  return (
    <TaskList path={path} mode={ViewMode.project} sections={sections} isLoading={isLoadingTasks || isLoadingSections} />
  );
}

export default Project;
