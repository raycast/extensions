import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { TaskDecorator } from "../../hooks/task.hook";
import { usePriorityAction, useProjectAction, useStatusActions, useTagAction } from "../../hooks/view.hook";
import { SaveCommand, UseCommand } from "../../hooks/command.hook";
import { stateCommands } from "../../core/types/task-cli.type";
import { dateAsString } from "../../core/helpers/date.helper";
import TaskForm from "../form-task/form-task.component";
import { NewProject } from "../new-project/new-project.component";
import { NewTag } from "../new-tag/new-tag.component";
import { ViewTypes } from "../../core/helpers/ui.helper";

export function useActions({
  task,
  views,
  commands,
  goToView,
  onSave,
  revalidate,
}: {
  task: TaskDecorator;
  views: ViewTypes;
  commands: UseCommand;
  onSave: SaveCommand;
  goToView: {
    next: () => void;
    prev: () => void;
  };
  revalidate: () => void;
}) {
  const [actions, setActions] = useState<JSX.Element>();
  const { actionCommand, modifyCommand } = commands;
  const StatusActions = () => (
    <ActionPanel.Section title="Status">
      {task.props.situation &&
        stateCommands[task.props.situation]?.map((action) => (
          <Action
            key={`task_${task.uuid}_action_${action}`}
            onAction={() => actionCommand(action)}
            {...useStatusActions[action]}
          />
        ))}
    </ActionPanel.Section>
  );
  const PriorityActions = () => (
    <ActionPanel.Submenu
      title="Priority…"
      icon={Icon.CheckRosette}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    >
      <Action {...usePriorityAction(task, modifyCommand, "L")} />
      <Action {...usePriorityAction(task, modifyCommand, "M")} />
      <Action {...usePriorityAction(task, modifyCommand, "H")} />
    </ActionPanel.Submenu>
  );
  const ProjectActions = () => (
    <ActionPanel.Submenu title="Project…" icon={Icon.Tray} shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}>
      {views.projects.map((project) => (
        <Action {...useProjectAction(task, project, modifyCommand)} />
      ))}
      <Action.Push
        key={`task_${task.uuid}_action_project_new`}
        title="New Project…"
        icon={{ source: Icon.Plus, tintColor: Color.Green }}
        target={<NewProject command={modifyCommand} />}
      />
    </ActionPanel.Submenu>
  );
  const TagActions = () => (
    <ActionPanel.Submenu title="Tags…" icon={Icon.Tag} shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}>
      {views.tags.map((tag) => (
        <Action {...useTagAction(task, tag, modifyCommand)} />
      ))}
      <Action.Push
        key={`task_${task.uuid}_action_tag_new`}
        title="New Tag…"
        icon={{ source: Icon.Plus, tintColor: Color.Green }}
        target={<NewTag command={modifyCommand} />}
      />
    </ActionPanel.Submenu>
  );
  const EditActions = () => (
    <>
      <Action.Push
        key={`task_${task.uuid}_action_edit`}
        title="Edit Task…"
        shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
        icon={{ source: Icon.Pencil, tintColor: Color.Green }}
        target={<TaskForm onSave={onSave} task={task.task} />}
      />
      <Action.Push
        key={`task_${task.uuid}_action_new`}
        title="Add New Task…"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={{ source: Icon.NewDocument, tintColor: Color.Green }}
        target={<TaskForm onSave={onSave} />}
      />
    </>
  );
  const ViewsActions = () => (
    <>
      <Action
        key={`task_${task.uuid}_action_views_prev`}
        title="Previous View…"
        shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
        icon={{ source: Icon.ChevronLeft, tintColor: Color.Green }}
        onAction={goToView.prev}
      />
      <Action
        key={`task_${task.uuid}_action_views_next`}
        title="Next View…"
        shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
        icon={{ source: Icon.ChevronRight, tintColor: Color.Green }}
        onAction={goToView.next}
      />
    </>
  );

  useEffect(() => {
    setActions(
      <>
        <EditActions />
        <StatusActions />
        <ActionPanel.Section title="Modify">
          <Action.PickDate
            title="Due…"
            key={`task_${task.uuid}_action_modify_due`}
            icon={Icon.Alarm}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onChange={(date) => modifyCommand("due", date ? dateAsString(date) : "")}
          />
          <PriorityActions />
          <ProjectActions />
          <TagActions />
        </ActionPanel.Section>
        <ActionPanel.Section title="Go To">
          <ViewsActions />
        </ActionPanel.Section>
        <ActionPanel.Submenu title="Reload…" icon={Icon.Repeat}>
          <Action
            key={`task_${task.uuid}_action_revalidate_tasks`}
            title="Tasks"
            icon={Icon.BulletPoints}
            onAction={revalidate}
          />
          <Action
            key={`task_${task.uuid}_action_revalidate_projects`}
            title="Projects"
            icon={Icon.Tray}
            onAction={views.revalidateProjects}
          />
          <Action
            key={`task_${task.uuid}_action_revalidate_tags`}
            title="Tags"
            icon={Icon.Tag}
            onAction={views.revalidateTags}
          />
          <Action
            key={`task_${task.uuid}_action_revalidate_all`}
            title="All"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => {
              views.revalidateProjects();
              views.revalidateTags();
              revalidate();
            }}
          />
        </ActionPanel.Submenu>
      </>
    );
  }, [task.task]);

  return actions;
}
