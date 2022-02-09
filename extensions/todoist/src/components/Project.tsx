import { getPreferenceValues } from "@raycast/api";
import TaskList from "./TaskList";
import useSWR from "swr";
import { partition } from "lodash";
import { ViewMode, SWRKeys, ProjectGroupBy, SectionWithTasks } from "../types";
import { todoist } from "../api";
import { getSectionsWithPriorities, getSectionsWithDueDates } from "../utils";

interface ProjectProps {
  projectId: number;
}

function Project({ projectId }: ProjectProps): JSX.Element {
  const { data: rawTasks } = useSWR(SWRKeys.tasks, () => todoist.getTasks({ projectId }));
  const { data: allSections } = useSWR(SWRKeys.sections, () => todoist.getSections(projectId));

  const preferences = getPreferenceValues();

  // Don't display sub-tasks
  const tasks = rawTasks?.filter((task) => !task.parentId) || [];

  let sections: SectionWithTasks[] = [];

  if (preferences.projectGroupBy === ProjectGroupBy.default) {
    sections = [
      {
        name: "No section",
        tasks: tasks?.filter((task) => task.sectionId === 0) || [],
      },
    ];

    if (allSections && allSections.length > 0) {
      sections.push(
        ...allSections.map((section) => ({
          name: section.name,
          tasks: tasks?.filter((task) => task.sectionId === section.id) || [],
        }))
      );
    }
  }

  if (preferences.projectGroupBy === ProjectGroupBy.priority) {
    sections = getSectionsWithPriorities(tasks);
  }

  if (preferences.projectGroupBy === ProjectGroupBy.date) {
    const [upcomingTasks, noDueDatesTasks] = partition(tasks, (task) => task.due);

    sections = getSectionsWithDueDates(upcomingTasks);

    sections.push({
      name: "No due date",
      tasks: noDueDatesTasks,
    });
  }

  return <TaskList mode={ViewMode.project} sections={sections} isLoading={!rawTasks || !allSections} />;
}

export default Project;
