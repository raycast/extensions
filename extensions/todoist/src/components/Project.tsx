import { List, getPreferenceValues, ActionPanel, Action } from "@raycast/api";
import TaskList from "./TaskList";
import useSWR from "swr";
import { partition } from "lodash";
import { ViewMode, SWRKeys, ProjectGroupBy, SectionWithTasks } from "../types";
import { todoist, handleError } from "../api";
import { getSectionsWithPriorities, getSectionsWithDueDates, getSectionsWithLabels } from "../helpers";
import CreateTask from "../create-task";

interface ProjectProps {
  projectId: number;
}

function Project({ projectId }: ProjectProps): JSX.Element {
  const { data: tasks } = useSWR(SWRKeys.tasks, () => todoist.getTasks({ projectId }));
  const { data: allSections } = useSWR(SWRKeys.sections, () => todoist.getSections(projectId));
  const { data: labels, error: getLabelsError } = useSWR(SWRKeys.labels, () => todoist.getLabels());

  const preferences = getPreferenceValues();

  let sections: SectionWithTasks[] = [];

  if (getLabelsError) {
    handleError({ error: getLabelsError, title: "Unable to get labels" });
  }

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
    sections = getSectionsWithPriorities(tasks || []);
  }

  if (preferences.projectGroupBy === ProjectGroupBy.date) {
    const [upcomingTasks, noDueDatesTasks] = partition(tasks, (task) => task.due);

    sections = getSectionsWithDueDates(upcomingTasks);

    sections.push({
      name: "No due date",
      tasks: noDueDatesTasks,
    });
  }

  if (preferences.todayGroupBy === ProjectGroupBy.label) {
    sections = getSectionsWithLabels({ tasks: tasks || [], labels: labels || [] });
  }

  return tasks?.length === 0 ? (
    <List isLoading={!tasks}>
      <List.EmptyView
        title="No tasks in this project."
        description="How about creating one?"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Task"
              target={<CreateTask fromProjectId={projectId} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel>
        }
      />
    </List>
  ) : (
    <TaskList mode={ViewMode.project} sections={sections} isLoading={!tasks || !allSections} />
  );
}

export default Project;
