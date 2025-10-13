import { useState } from "react";
import { Icon, ActionPanel, Action, confirmAlert, Color, showToast, Toast, useNavigation } from "@raycast/api";
import { getAvatarIcon, MutatePromise } from "@raycast/utils";
import { User } from "../api/users";
import { Project, addProject, removeProject } from "../api/projects";
import { useUsers } from "../hooks/useUsers";
import { useProjects } from "../hooks/useProjects";
import { asanaToRaycastColor } from "../helpers/colors";
import { getErrorMessage } from "../helpers/errors";
import { Task, updateTask, deleteTask as apiDeleteTask, CustomField, EnumValue } from "../api/tasks";
import { format } from "date-fns";
import { partition } from "lodash";

type TaskActionProps = {
  task: Task;
  workspace?: string;
  isDetail?: boolean;
  mutateList?: MutatePromise<Task[] | undefined>;
  mutateDetail?: MutatePromise<Task>;
};

type MutateParams = {
  asyncUpdate: Promise<Task>;
  optimisticUpdate: <T extends Task>(task: T) => T;
  rollbackUpdate?: <T extends Task>(task: T) => T;
};

export default function TaskActions({ task, workspace, isDetail, mutateList, mutateDetail }: TaskActionProps) {
  const { pop } = useNavigation();

  async function mutate({ asyncUpdate, optimisticUpdate, rollbackUpdate }: MutateParams) {
    await Promise.all([
      asyncUpdate,
      mutateList
        ? mutateList(asyncUpdate, {
            optimisticUpdate(data) {
              if (!data) {
                return;
              }
              return data.map((t) => (t.gid === task.gid ? optimisticUpdate(t) : t));
            },
            ...(rollbackUpdate
              ? {
                  rollbackOnError(data) {
                    if (!data) {
                      return;
                    }
                    return data.map((t) => (t.gid === task.gid ? rollbackUpdate(t) : t));
                  },
                }
              : {}),
          })
        : Promise.resolve(),
      mutateDetail
        ? mutateDetail(asyncUpdate, {
            optimisticUpdate(data) {
              return optimisticUpdate(data);
            },
            ...(rollbackUpdate
              ? {
                  rollbackOnError(data) {
                    return rollbackUpdate(data);
                  },
                }
              : {}),
          })
        : Promise.resolve(),
    ]);
  }

  async function toggleTaskCompletion() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Marking task as ${task.completed ? "incomplete" : "completed"}`,
      });

      const asyncUpdate = updateTask(task.gid, { completed: !task.completed });

      mutate({
        asyncUpdate,
        optimisticUpdate(task) {
          return { ...task, completed: !task.completed };
        },
        rollbackUpdate(task) {
          return { ...task, completed: task.completed };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: `Marked task as ${task.completed ? "incomplete" : "completed"}`,
        message: task.name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to mark task as ${task.completed ? "incomplete" : "completed"}`,
        message: getErrorMessage(error),
      });
    }
  }

  async function deleteTask() {
    if (
      await confirmAlert({
        title: "Delete Task",
        message: "Are you sure you want to delete the selected task?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting task" });

        // Convert the client async function to a promise since Bluebird is used under the hood
        const asyncUpdate = apiDeleteTask(task.gid);

        if (mutateList) {
          mutateList(asyncUpdate, {
            optimisticUpdate(data) {
              if (!data) {
                return;
              }

              return data.filter((t) => t.gid !== task.gid);
            },
          });
        }

        if (isDetail) {
          pop();
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Task deleted",
          message: `"${task.name}" is deleted`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete task",
          message: getErrorMessage(error),
        });
      }
    }
  }

  const openTaskInBrowserAction = (
    <Action.OpenInBrowser url={task.permalink_url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
  );

  return (
    <>
      {isDetail ? openTaskInBrowserAction : null}

      <Action
        title={task.completed ? "Mark as Incomplete" : "Mark as Completed"}
        icon={task.completed ? Icon.Circle : Icon.CheckCircle}
        onAction={toggleTaskCompletion}
      />

      {!isDetail ? openTaskInBrowserAction : null}

      <ActionPanel.Section>
        <UsersSubmenu workspace={workspace} task={task} mutate={mutate} />
        <DueOnSubMenu task={task} mutate={mutate} />
        <ProjectsSubmenu workspace={workspace} task={task} mutate={mutate} />

        {task.custom_fields &&
          task.custom_fields.length > 0 &&
          task.custom_fields
            .filter((field) => field.resource_subtype === "enum")
            .map((field) => {
              return <CustomFieldSubmenu key={field.gid} task={task} field={field} mutate={mutate} />;
            })}

        <Action
          style={Action.Style.Destructive}
          title="Delete Task"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={deleteTask}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Task URL"
          content={task.permalink_url}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          title="Copy Task Name"
          content={task.name}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />

        <Action.CopyToClipboard
          title="Copy Task Formatted URL"
          content={`[${task.name}](${task.permalink_url})`}
          shortcut={{ modifiers: ["cmd", "ctrl"], key: "." }}
        />

        <Action.CopyToClipboard title="Copy Task ID" content={task.gid} shortcut={{ modifiers: ["cmd"], key: "i" }} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            if (mutateList) {
              mutateList();
            }

            if (mutateDetail) {
              mutateDetail();
            }
          }}
        />
      </ActionPanel.Section>
    </>
  );
}

type UsersSubmenuProps = {
  task: Task;
  workspace?: string;
  mutate: (params: MutateParams) => void;
};

type ProjectsSubmenuProps = UsersSubmenuProps;
type DueOnSubmenuProps = UsersSubmenuProps;

function UsersSubmenu({ workspace, task, mutate }: UsersSubmenuProps) {
  const [load, setLoad] = useState(false);
  const { data: users, isLoading } = useUsers(workspace, { execute: load });

  async function changeAssignee(assignee: User | null) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Changing assignee" });

      const asyncUpdate = updateTask(task.gid, { assignee: assignee?.gid || null });

      mutate({
        asyncUpdate,
        optimisticUpdate(task) {
          return { ...task, assignee };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Changed assignee",
        message: assignee ? `Assigned to ${assignee.name}` : "Task unassigned",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to change assignee",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel.Submenu
      title="Assign to"
      icon={Icon.AddPerson}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onOpen={() => setLoad(true)}
    >
      {isLoading ? (
        <Action title="Loading…" />
      ) : (
        <>
          <Action title="Unassigned" icon={Icon.Person} onAction={() => changeAssignee(null)} />

          {users?.map((user) => {
            return (
              <Action
                key={user.gid}
                title={user.name}
                icon={getAvatarIcon(user.name)}
                onAction={() => changeAssignee(user)}
              />
            );
          })}
        </>
      )}
    </ActionPanel.Submenu>
  );
}

function ProjectsSubmenu({ workspace, task, mutate }: ProjectsSubmenuProps) {
  const { data: projects, isLoading } = useProjects(workspace);

  const changeProject = async (project: Project, action: "add" | "remove") => {
    try {
      await showToast({ style: Toast.Style.Animated, title: action === "add" ? "Adding project" : "Removing project" });

      const asyncUpdate = action === "add" ? addProject(task.gid, project.gid) : removeProject(task.gid, project.gid);

      await mutate({
        asyncUpdate,
        optimisticUpdate: (task) => {
          const newProjects =
            action === "add" ? [...task.projects, project] : task.projects.filter((p) => p.gid !== project.gid);
          return { ...task, projects: newProjects };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: action === "add" ? "Added project" : "Removed project",
        message:
          action === "add"
            ? `"${project.name}" added to "${task.name}"`
            : `"${project.name}" removed from "${task.name}"`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to change project",
        message: getErrorMessage(error),
      });
    }
  };

  const [projectsToAdd, projectsToRemove] = partition(projects, (project) => {
    return !task.projects.find((p) => p.gid === project.gid);
  });

  return (
    <ActionPanel.Submenu title="Change Project" icon={Icon.Folder} shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}>
      {isLoading ? (
        <Action title="Loading…" />
      ) : (
        <>
          {projectsToAdd && projectsToAdd.length > 0 ? (
            <ActionPanel.Submenu title="Add Project" icon={Icon.Plus}>
              {projectsToAdd.map((project) => (
                <Action
                  key={project.gid}
                  title={project.name}
                  icon={getAvatarIcon(project.name)}
                  onAction={() => changeProject(project, "add")}
                />
              ))}
            </ActionPanel.Submenu>
          ) : null}

          {projectsToRemove && projectsToRemove.length > 0 ? (
            <ActionPanel.Submenu title="Remove Project" icon={Icon.Minus}>
              {projectsToRemove.map((project) => (
                <Action
                  key={project.gid}
                  title={project.name}
                  icon={getAvatarIcon(project.name)}
                  onAction={() => changeProject(project, "remove")}
                />
              ))}
            </ActionPanel.Submenu>
          ) : null}
        </>
      )}
    </ActionPanel.Submenu>
  );
}

function DueOnSubMenu({ task, mutate }: DueOnSubmenuProps) {
  async function changeDueOn(dueOn: Date | null) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Changing due date" });

      // Adjust the date to UTC
      const utcDueOn = dueOn ? new Date(Date.UTC(dueOn.getFullYear(), dueOn.getMonth(), dueOn.getDate())) : null;

      const asyncUpdate = updateTask(task.gid, { due_on: utcDueOn });

      mutate({
        asyncUpdate,
        optimisticUpdate(task) {
          return { ...task, due_on: utcDueOn };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Changed due date",
        message: utcDueOn ? `Due on ${format(utcDueOn, "d MMM yyyy")}` : "No due date",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to change due date",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <Action.PickDate
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      icon={Icon.Calendar}
      type={Action.PickDate.Type.Date}
      title="Set Due Date…"
      onChange={changeDueOn}
    />
  );
}

type CustomFieldSubmenuProps = {
  task: Task;
  field: CustomField;
  mutate: (params: MutateParams) => void;
};

function CustomFieldSubmenu({ task, mutate, field }: CustomFieldSubmenuProps) {
  async function updateField(option: EnumValue | null) {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Changing ${field.name}` });

      // Convert the client async function to a promise since Bluebird is used under the hood
      const asyncUpdate = updateTask(task.gid, { custom_fields: { [field.gid]: option?.gid || null } });

      mutate({
        asyncUpdate,
        optimisticUpdate(task) {
          return {
            ...task,
            custom_fields: task.custom_fields.map((f) => {
              if (f.gid === field.gid) {
                return {
                  ...f,
                  enum_value: option ? { ...f.enum_value, name: option.name, color: option.color } : null,
                };
              }

              return f;
            }),
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: `Changed ${field.name}`,
        message: option ? option.name : "None",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to change ${field.name}`,
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel.Submenu icon={Icon.Pencil} title={`Change ${field.name}`}>
      {field.enum_options && field.enum_options.length > 0 ? (
        <>
          <Action title="–" onAction={() => updateField(null)} />

          {field.enum_options.map((option) => {
            return (
              <Action
                key={option.gid}
                title={option.name}
                icon={{ source: Icon.Circle, tintColor: asanaToRaycastColor(option.color) }}
                onAction={() => updateField(option)}
              />
            );
          })}
        </>
      ) : null}
    </ActionPanel.Submenu>
  );
}
