import { Action, ActionPanel, Detail, environment, Icon, List } from "@raycast/api";
import { startActivity } from "./commands/activities/api";
import { ActivityStart } from "./commands/activities/components/ActivityStart";
import { Project } from "./commands/projects/types";
import { Task } from "./commands/tasks/types";
import { finishMenuBarForm } from "./utils/refresh";
import { removeStatus, setStatus, StatusType } from "./utils/storage";

// "Context menu" for a menu bar row, opened via launchCommand with { kind: "task", task } or { kind: "project", project }.
export default function Command() {
  const context = environment.launchContext;
  if (context?.kind === "project" && context.project) {
    return <ProjectActions project={context.project as Pick<Project, "id" | "name">} />;
  }

  const task = context?.task as Task | undefined;
  if (task === undefined) {
    return <Detail markdown="Right-click a task in the MOCO menu bar to see its actions here." />;
  }
  return <TaskActions task={task} isFavorite={context?.isFavorite === true} />;
}

const ProjectActions = ({ project }: { project: Pick<Project, "id" | "name"> }) => {
  const hide = async () => {
    await setStatus("project", project.id, StatusType.hidden);
    await finishMenuBarForm();
  };

  return (
    <List navigationTitle={project.name} searchBarPlaceholder="Filter actions...">
      <List.Item
        icon={Icon.EyeDisabled}
        title="Hide Project"
        subtitle="Unhide via Hidden Projects in the menu bar or the project list"
        actions={
          <ActionPanel>
            <Action title="Hide Project" icon={Icon.EyeDisabled} onAction={hide} />
          </ActionPanel>
        }
      />
    </List>
  );
};

const TaskActions = ({ task, isFavorite }: { task: Task; isFavorite: boolean }) => {
  const start = async () => {
    const today = new Date().toISOString().split("T")[0];
    const success = await startActivity({
      date: today,
      description: task.name,
      hours: "",
      projectID: task.projectID,
      taskID: task.id,
    });
    if (success === true) {
      await finishMenuBarForm();
    }
  };

  const changeStatus = async (status: StatusType | undefined) => {
    if (status === undefined) {
      await removeStatus("task", task.id);
    } else {
      await setStatus("task", task.id, status);
    }
    await finishMenuBarForm();
  };

  return (
    <List navigationTitle={`${task.projectName} / ${task.name}`} searchBarPlaceholder="Filter actions...">
      <List.Item
        icon={Icon.Play}
        title="Start"
        subtitle="Description = task name"
        actions={
          <ActionPanel>
            <Action title="Start" icon={Icon.Play} onAction={start} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Pencil}
        title="Start with Description…"
        actions={
          <ActionPanel>
            <Action.Push
              title="Start with Description…"
              icon={Icon.Pencil}
              target={<ActivityStart task={task} onSubmitted={finishMenuBarForm} />}
            />
          </ActionPanel>
        }
      />
      {isFavorite ? (
        <List.Item
          icon={Icon.StarDisabled}
          title="Remove from Favorites"
          actions={
            <ActionPanel>
              <Action title="Remove from Favorites" icon={Icon.StarDisabled} onAction={() => changeStatus(undefined)} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Item
          icon={Icon.Star}
          title="Set to Favorite"
          actions={
            <ActionPanel>
              <Action title="Set to Favorite" icon={Icon.Star} onAction={() => changeStatus(StatusType.favorite)} />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        icon={Icon.EyeDisabled}
        title="Hide Task"
        actions={
          <ActionPanel>
            <Action title="Hide Task" icon={Icon.EyeDisabled} onAction={() => changeStatus(StatusType.hidden)} />
          </ActionPanel>
        }
      />
    </List>
  );
};
