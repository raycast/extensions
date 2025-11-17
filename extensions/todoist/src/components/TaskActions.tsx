import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  open,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Fragment } from "react";

import {
  AddReminderArgs,
  AddTaskArgs,
  MoveTaskArgs,
  Reminder,
  SyncData,
  Task,
  UpdateTaskArgs,
  addTask,
  addReminder as apiAddReminder,
  deleteReminder as apiDeleteReminder,
  deleteTask as apiDeleteTask,
  moveTask as apiMoveTask,
  updateTask as apiUpdateTask,
  closeTask,
} from "../api";
import CreateTask from "../create-task";
import { getCollaboratorIcon, getProjectCollaborators } from "../helpers/collaborators";
import { getAPIDate } from "../helpers/dates";
import { getRemainingLabels, getTaskLabels } from "../helpers/labels";
import { refreshMenuBarCommand } from "../helpers/menu-bar";
import { getPriorityIcon, priorities } from "../helpers/priorities";
import { getProjectIcon } from "../helpers/projects";
import { displayReminderName } from "../helpers/reminders";
import { ViewMode, getTaskAppUrl, getTaskUrl } from "../helpers/tasks";
import { QuickLinkView } from "../home";
import { useFocusedTask } from "../hooks/useFocusedTask";
import { ViewProps } from "../hooks/useViewTasks";

import CreateViewActions from "./CreateViewActions";
import OpenInTodoist from "./OpenInTodoist";
import Project from "./Project";
import RefreshAction from "./RefreshAction";
import SubTasks from "./SubTasks";
import TaskCommentForm from "./TaskCommentForm";
import TaskComments from "./TaskComments";
import TaskEdit from "./TaskEdit";

type TaskActionsProps = {
  task: Task;
  fromDetail?: boolean;
  mode?: ViewMode;
  viewProps?: ViewProps;
  data?: SyncData;
  setData: React.Dispatch<React.SetStateAction<SyncData | undefined>>;
  quickLinkView?: QuickLinkView;
};

export default function TaskActions({
  task,
  fromDetail,
  viewProps,
  mode,
  data,
  setData,
  quickLinkView,
}: TaskActionsProps) {
  const { pop } = useNavigation();
  const { useConfetti } = getPreferenceValues<Preferences>();

  const { focusedTask, focusTask, unfocusTask } = useFocusedTask();

  const projects = data?.projects;
  const comments = data?.notes;
  const taskLabels = task && data?.labels ? getTaskLabels(task, data.labels) : [];
  const remainingLabels = task && data?.labels ? getRemainingLabels(task, data.labels) : [];

  async function completeTask(task: Task) {
    await showToast({ style: Toast.Style.Animated, title: "Completing task" });

    try {
      await closeTask(task.id, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Task completed 🙌" });
      await refreshMenuBarCommand();

      if (focusedTask.id === task.id) {
        unfocusTask();
      }

      if (fromDetail) {
        pop();
      }
    } catch (error) {
      await showFailureToast(error, { title: "Unable to complete task" });
    }
    if (useConfetti) {
      try {
        await open("raycast://extensions/raycast/raycast/confetti");
      } catch (error) {
        await showFailureToast(error, { title: "Unable to show celebration" });
      }
    }
  }

  async function updateTask(payload: UpdateTaskArgs) {
    await showToast({ style: Toast.Style.Animated, title: "Updating task" });

    try {
      await apiUpdateTask(payload, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Task updated" });
      await refreshMenuBarCommand();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to update task" });
    }
  }

  async function addReminder(payload: AddReminderArgs) {
    await showToast({ style: Toast.Style.Animated, title: "Adding reminder" });

    try {
      await apiAddReminder(payload, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Added reminder" });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to add reminder" });
    }
  }

  async function deleteReminder(reminder: Reminder) {
    await showToast({ style: Toast.Style.Animated, title: "Deleting reminder" });

    try {
      await apiDeleteReminder(reminder.id, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Reminder deleted" });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to delete reminder" });
    }
  }

  async function moveTask(payload: MoveTaskArgs) {
    await showToast({ style: Toast.Style.Animated, title: "Moving task" });

    try {
      await apiMoveTask(payload, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Moved task" });
      await refreshMenuBarCommand();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to move task" });
    }
  }

  async function duplicateTask() {
    await showToast({ style: Toast.Style.Animated, title: "Duplicating task", message: task.content });

    const payload: AddTaskArgs = {
      content: task.content,
      description: task.description,
      project_id: task.project_id,
      section_id: task.section_id ? task.section_id : undefined,
      parent_id: task.parent_id ? task.parent_id : undefined,
      child_order: task.child_order ? task.child_order : undefined,
      labels: task.labels,
      priority: task.priority,
      due: task.due ? { date: task.due.date } : undefined,
      responsible_uid: task.responsible_uid ? task.responsible_uid : undefined,
    };

    try {
      await addTask(payload, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Duplicated task", message: task.content });
      await refreshMenuBarCommand();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to duplicate task" });
    }
  }

  async function deleteTask(task: Task) {
    if (
      await confirmAlert({
        title: "Delete Task",
        message: "Are you sure you want to delete this task?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      await showToast({ style: Toast.Style.Animated, title: "Deleting task" });

      try {
        await apiDeleteTask(task.id, { data, setData });
        await showToast({ style: Toast.Style.Success, title: "Task deleted" });
        await refreshMenuBarCommand();

        if (fromDetail) {
          pop();
        }
      } catch (error) {
        await showFailureToast(error, { title: "Unable to delete task" });
      }
    }
  }

  const associatedProject = projects?.find((project) => project.id === task.project_id);

  const hasComments = comments?.some((comment) => comment.item_id === task.id);
  const subTasks = data?.items.filter((item) => item.parent_id === task.id);

  const collaborators = getProjectCollaborators(task.project_id, data);
  const locations = data?.locations;

  const reminders =
    data?.reminders.filter((r) => {
      if (r.is_deleted === 1) return false;

      return r.item_id === task.id;
    }) ?? [];

  return (
    <>
      <Action title="Complete Task" icon={Icon.Checkmark} onAction={() => completeTask(task)} />
      <OpenInTodoist appUrl={getTaskAppUrl(task.id)} webUrl={getTaskUrl(task.id)} />
      <ActionPanel.Section>
        {focusedTask.id !== task.id ? (
          <Action
            title="Focus Task"
            icon={Icon.Center}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => {
              focusTask(task);
              refreshMenuBarCommand();
            }}
          />
        ) : (
          <Action
            title="Unfocus Task"
            icon={Icon.MinusCircle}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => {
              unfocusTask();
              refreshMenuBarCommand();
            }}
          />
        )}

        <Action.Push
          title="Edit Task"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<TaskEdit task={task} />}
        />

        <ActionPanel.Submenu
          title="Schedule Task"
          icon={Icon.Calendar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        >
          <Action.PickDate
            title="Pick Date"
            type={Action.PickDate.Type.DateTime}
            onChange={(date) =>
              updateTask({
                id: task.id,
                due: date
                  ? { date: Action.PickDate.isFullDay(date) ? getAPIDate(date) : date.toISOString() }
                  : { string: "no date" },
              })
            }
          />
          <Action
            title="Set Due to Every Day"
            icon={Icon.Repeat}
            onAction={() => updateTask({ id: task.id, due: { string: "every day" } })}
          />
        </ActionPanel.Submenu>

        {data?.user?.premium_status !== "not_premium" ? (
          <Action.PickDate
            icon={Icon.BullsEye}
            title="Schedule Task Deadline"
            type={Action.PickDate.Type.Date}
            shortcut={{ modifiers: ["opt", "shift"], key: "d" }}
            onChange={(date) =>
              updateTask({
                id: task.id,
                deadline: date ? { date: date.toISOString() } : { string: "no date" },
              })
            }
          />
        ) : null}

        <ActionPanel.Submenu
          icon={Icon.LevelMeter}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          title="Change Task Priority"
        >
          {priorities.map(({ value, name, color, icon }) => (
            <Action
              key={name}
              title={name}
              icon={{ source: icon, tintColor: color }}
              onAction={() => updateTask({ id: task.id, priority: value })}
            />
          ))}
        </ActionPanel.Submenu>

        {data?.user.is_premium ? (
          <>
            <Action.PickDate
              title="Add Time Reminder"
              type={Action.PickDate.Type.DateTime}
              icon={Icon.Alarm}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onChange={(date) => {
                if (date) {
                  addReminder({ item_id: task.id, type: "absolute", due: { date: date?.toISOString() } });
                }
              }}
            />

            {locations && locations.length > 0 ? (
              <ActionPanel.Submenu
                title="Add Location Reminder"
                icon={Icon.Pin}
                shortcut={{ modifiers: ["opt", "shift"], key: "r" }}
              >
                <ActionPanel.Section title="Arriving">
                  {locations.map((location) => {
                    return (
                      <Action
                        key={`arriving-${location[0]}`}
                        title={location[0]}
                        onAction={() =>
                          addReminder({
                            type: "location",
                            item_id: task.id,
                            loc_trigger: "on_enter",
                            name: location[0],
                            loc_lat: location[1],
                            loc_long: location[2],
                          })
                        }
                      />
                    );
                  })}
                </ActionPanel.Section>

                <ActionPanel.Section title="Leaving">
                  {locations.map((location) => {
                    return (
                      <Action
                        key={`leaving-${location[0]}`}
                        title={location[0]}
                        onAction={() =>
                          addReminder({
                            type: "location",
                            item_id: task.id,
                            loc_trigger: "on_leave",
                            name: location[0],
                            loc_lat: location[1],
                            loc_long: location[2],
                          })
                        }
                      />
                    );
                  })}
                </ActionPanel.Section>
              </ActionPanel.Submenu>
            ) : null}

            {reminders.length === 1 ? (
              <Action
                title="Delete Reminder"
                icon={Icon.Minus}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                onAction={() => deleteReminder(reminders[0])}
              />
            ) : null}

            {reminders.length > 1 ? (
              <ActionPanel.Submenu
                title="Delete Reminder"
                icon={Icon.Minus}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
              >
                {reminders.map((reminder) => {
                  const use12HourFormat = data?.user?.time_format === 1;
                  return (
                    <Action
                      key={reminder.id}
                      title={displayReminderName(reminder, use12HourFormat)}
                      onAction={() => deleteReminder(reminder)}
                    />
                  );
                })}
              </ActionPanel.Submenu>
            ) : null}
          </>
        ) : null}

        {projects ? (
          <ActionPanel.Submenu
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            title="Move Task to Project"
          >
            {projects.map((project) => {
              const sections = data.sections?.filter((section) => section.project_id === project.id);

              return (
                <Fragment key={project.id}>
                  <Action
                    title={project.name}
                    icon={getProjectIcon(project)}
                    onAction={() => moveTask({ id: task.id, project_id: project.id })}
                  />

                  {sections && sections.length > 0
                    ? sections.map((section) => {
                        return (
                          <Action
                            key={section.id}
                            title={section.name}
                            icon={{ source: "section.svg", tintColor: Color.PrimaryText }}
                            onAction={() => moveTask({ id: task.id, section_id: section.id })}
                          />
                        );
                      })
                    : null}
                </Fragment>
              );
            })}
          </ActionPanel.Submenu>
        ) : null}

        {remainingLabels && remainingLabels.length > 0 ? (
          <ActionPanel.Submenu title="Add Label" icon={Icon.Tag} shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}>
            {remainingLabels.map((label) => {
              return (
                <Action
                  key={label.id}
                  title={label.name}
                  icon={{ source: Icon.Tag, tintColor: label.color }}
                  onAction={() => updateTask({ id: task.id, labels: [...task.labels, label.name] })}
                />
              );
            })}
          </ActionPanel.Submenu>
        ) : null}

        {taskLabels && taskLabels.length > 0 ? (
          <ActionPanel.Submenu
            title="Remove Label"
            icon={Icon.Tag}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "l" }}
          >
            {taskLabels.map((label) => {
              return (
                <Action
                  key={label.id}
                  title={label.name}
                  icon={{ source: Icon.Tag, tintColor: label.color }}
                  onAction={() =>
                    updateTask({
                      id: task.id,
                      labels: taskLabels.filter((taskLabel) => taskLabel.name !== label.name).map((l) => l.name),
                    })
                  }
                />
              );
            })}
          </ActionPanel.Submenu>
        ) : null}

        {data?.items && data?.items.length > 0 ? (
          <ActionPanel.Submenu
            icon={Icon.PlusTopRightSquare}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            title="Set Parent Task"
          >
            {data.items.map((item) => {
              if (item.id === task.id) {
                return null;
              }

              return (
                <Action
                  key={item.id}
                  title={item.content}
                  icon={getPriorityIcon(item)}
                  onAction={() => moveTask({ id: task.id, parent_id: item.id })}
                />
              );
            })}
          </ActionPanel.Submenu>
        ) : null}

        {collaborators && collaborators.length > 0 ? (
          <ActionPanel.Submenu
            icon={Icon.AddPerson}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            title="Assign to"
          >
            {collaborators.map((collaborator) => {
              return (
                <Action
                  key={collaborator.id}
                  icon={getCollaboratorIcon(collaborator)}
                  title={collaborator.full_name}
                  onAction={() => updateTask({ id: task.id, responsible_uid: collaborator.id })}
                />
              );
            })}
          </ActionPanel.Submenu>
        ) : null}

        <Action
          title="Duplicate Task"
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={duplicateTask}
        />

        <Action
          title="Delete Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => deleteTask(task)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {subTasks && subTasks.length > 0 ? (
          <Action.Push
            title="Show Sub-Tasks"
            icon={{ source: "sub-task.svg", tintColor: Color.PrimaryText }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            target={<SubTasks parentTask={task} />}
          />
        ) : null}

        {associatedProject && (mode === ViewMode.date || mode === ViewMode.search) ? (
          <Action.Push
            title="Show Project"
            target={<Project projectId={associatedProject.id} />}
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          />
        ) : null}

        {hasComments ? (
          <Action.Push
            title="Show Comments"
            target={<TaskComments task={task} />}
            icon={Icon.Bubble}
            shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          />
        ) : null}

        <Action.Push
          title="Add New Comment"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
          target={<TaskCommentForm task={task} />}
        />

        <Action.Push
          title="Add New Task"
          target={<CreateTask fromProjectId={mode === ViewMode.project ? task.project_id : undefined} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          icon={Icon.PlusCircle}
        />
      </ActionPanel.Section>

      {viewProps ? (
        <ActionPanel.Section>
          {viewProps.groupBy ? (
            <ActionPanel.Submenu
              title="Group Tasks by"
              icon={Icon.AppWindowGrid3x3}
              shortcut={{ modifiers: ["opt", "shift"], key: "g" }}
            >
              {viewProps.groupBy.options.map((option) => {
                return (
                  <Action
                    key={option.value}
                    title={option.label}
                    icon={option.icon}
                    autoFocus={viewProps.groupBy?.value === option.value}
                    onAction={() => viewProps.groupBy?.setValue(option.value)}
                  />
                );
              })}
            </ActionPanel.Submenu>
          ) : null}

          <ActionPanel.Submenu
            title="Sort Tasks by"
            icon={Icon.BulletPoints}
            shortcut={{ modifiers: ["opt", "shift"], key: "s" }}
          >
            {viewProps.sortBy.options.map((option) => {
              return (
                <Action
                  key={option.value}
                  title={option.label}
                  icon={option.icon}
                  autoFocus={viewProps.sortBy.value === option.value}
                  onAction={() => viewProps.sortBy.setValue(option.value)}
                />
              );
            })}
          </ActionPanel.Submenu>

          {viewProps.orderBy ? (
            <ActionPanel.Submenu
              title="Order Tasks by"
              icon={viewProps.orderBy.value === "desc" ? Icon.ArrowUp : Icon.ArrowDown}
              shortcut={{ modifiers: ["opt", "shift"], key: "o" }}
            >
              {viewProps.orderBy.options.map((option) => {
                return (
                  <Action
                    key={option.value}
                    title={option.label}
                    icon={option.icon}
                    autoFocus={viewProps.orderBy?.value === option.value}
                    onAction={() => viewProps.orderBy?.setValue(option.value)}
                  />
                );
              })}
            </ActionPanel.Submenu>
          ) : null}
        </ActionPanel.Section>
      ) : null}

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Task URL"
          content={getTaskUrl(task.id)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          title="Copy Task Title"
          content={task.content}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>

      {quickLinkView ? (
        <ActionPanel.Section>
          <CreateViewActions {...quickLinkView} />
        </ActionPanel.Section>
      ) : null}

      <RefreshAction />
    </>
  );
}
