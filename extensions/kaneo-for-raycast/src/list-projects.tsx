import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  Detail,
  openExtensionPreferences,
  Color,
  Keyboard,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  useNavigation,
} from "@raycast/api";
import { useForm, FormValidation, showFailureToast, usePromise } from "@raycast/utils";
import { ChangeStatus, ChangePriority, CopyTaskTitle, CopyTaskDescription, CopyProjectName } from "./shortcut";
import { Project, Task, CreateProjectFormValues, CreateTaskFormValues } from "./types";
import { KaneoAPI } from "./api/kaneo";

function formatDate(date: string | null) {
  if (!date) return "N/A";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
}

const formatShortDate = (date: string | null) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "N/A" : `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
};

const cleanDescription = (description: string) => {
  return description?.length
    ? description
        .replace(/<p>/g, "")
        .replace(/<\/p>/g, "\n")
        .replace(/<br\s*\/?>/g, "\n")
    : "No description";
};

const statusKey: Record<string, Keyboard.KeyEquivalent> = {
  backlog: "b",
  "to-do": "t",
  "in-progress": "p",
  "in-review": "r",
  done: "d",
};

const priorityKey: Record<string, Keyboard.KeyEquivalent> = {
  "no-priority": "n",
  low: "l",
  medium: "m",
  high: "h",
  urgent: "u",
};

const priorityColor: Record<string, string> = {
  "no-priority": Color.SecondaryText,
  low: Color.Blue,
  medium: Color.Yellow,
  high: Color.Orange,
  urgent: Color.Red,
};

function CreateProjectForm({ onProjectCreated }: { onProjectCreated: () => void }) {
  const { pop } = useNavigation();
  const api = new KaneoAPI();

  const { handleSubmit, itemProps, setValue } = useForm<CreateProjectFormValues>({
    async onSubmit(values) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating project...",
      });

      try {
        await api.createProject({ name: values.name, slug: values.slug, icon: "" });

        showToast(Toast.Style.Success, "Project created successfully");

        onProjectCreated();
        pop();
      } catch (error) {
        showFailureToast(error, {
          title: "Failed to create project",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    validation: {
      name: FormValidation.Required,
      slug: FormValidation.Required,
    },
  });

  const onNameChange = (value: string) => {
    itemProps.name.onChange?.(value);
    const words = value.split(/\s+/).filter(Boolean);
    const slug = value.includes(" ") ? words.map((w) => w[0]).join("") : words[0]?.substring(0, 3) || "";
    setValue("slug", slug.toUpperCase().slice(0, 3));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter project name" {...itemProps.name} onChange={onNameChange} />
      <Form.TextField title="Slug" placeholder="Enter project slug" {...itemProps.slug} />
    </Form>
  );
}

function CreateTaskForm({
  projectId,
  columnStatuses,
  onTaskCreated,
}: {
  projectId: string;
  columnStatuses: Array<{ id: string; name: string }>;
  onTaskCreated: () => void;
}) {
  const { pop } = useNavigation();
  const kaneoApi = new KaneoAPI();

  const { handleSubmit, itemProps } = useForm<CreateTaskFormValues>({
    async onSubmit(values) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });

      try {
        await kaneoApi.createTask(projectId, {
          title: values.title,
          description: values.description || "",
          status: values.status,
          priority: values.priority || "no-priority",
          ...(values.dueDate && { dueDate: values.dueDate.toISOString() }),
        });

        showToast(Toast.Style.Success, "Task created successfully");

        onTaskCreated();
        pop();
      } catch (error) {
        showFailureToast(error, {
          title: "Failed to create task",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    initialValues: {
      status: columnStatuses[0]?.id || "",
      priority: "no-priority",
    },
    validation: {
      title: FormValidation.Required,
      priority: FormValidation.Required,
      status: FormValidation.Required,
    },
  });

  const priorityOptions = [
    { value: "no-priority", title: "No Priority" },
    { value: "low", title: "Low" },
    { value: "medium", title: "Medium" },
    { value: "high", title: "High" },
    { value: "urgent", title: "Urgent" },
  ];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Enter task title" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Enter task description (optional)" {...itemProps.description} />
      <Form.Dropdown title="Status" {...itemProps.status}>
        {columnStatuses.map((status) => (
          <Form.Dropdown.Item key={status.id} value={status.id} title={status.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        {priorityOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker title="Due Date" {...itemProps.dueDate} />
    </Form>
  );
}

function TaskDetailView({
  taskId,
  projectId,
  columnStatuses,
  columnPriorities,
  onStatusUpdate,
  onPriorityUpdate,
}: {
  taskId: string;
  projectId: string;
  columnStatuses: Array<{
    isDone: boolean;
    id: string;
    name: string;
  }>;
  columnPriorities: Array<{ id: string; name: string }>;
  onStatusUpdate: (taskId: string, newStatus: string, taskTitle: string) => Promise<void>;
  onPriorityUpdate: (taskId: string, newPriority: string, taskTitle: string) => Promise<void>;
}) {
  const api = new KaneoAPI();
  const { webInstanceUrl, workspaceId } = getPreferenceValues<Preferences>();

  const { isLoading, data: task, revalidate } = usePromise((id: string) => api.getTask(id), [taskId]);

  if (isLoading || !task) {
    return <Detail isLoading markdown="Loading task..." />;
  }

  const status = task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : "N/A";
  const priorityRaw = task.priority || "no-priority";
  const priority = priorityRaw.charAt(0).toUpperCase() + priorityRaw.slice(1).replaceAll("-", " ");

  const markdown = `# ${task.title}

## Description
${cleanDescription(task.description)}

## Status
${status}

## Priority
${priority}

## Due Date
${formatDate(task.dueDate)}

## Assignee
${task.assigneeName || "Unassigned"}

## Created At
${formatDate(task.createdAt)}
`;

  const openTask = () => {
    const webUrl = new URL(webInstanceUrl);
    webUrl.pathname = `/dashboard/workspace/${workspaceId}/project/${projectId}/task/${task.id}`;
    return webUrl.toString();
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string, taskTitle: string) => {
    await onStatusUpdate(taskId, newStatus, taskTitle);
    await revalidate();
  };

  const handlePriorityUpdate = async (taskId: string, newPriority: string, taskTitle: string) => {
    await onPriorityUpdate(taskId, newPriority, taskTitle);
    await revalidate();
  };

  return (
    <Detail
      navigationTitle={task.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={status} />
          <Detail.Metadata.Label title="Priority" text={priority} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Due Date" text={formatDate(task.dueDate)} />
          <Detail.Metadata.Label title="Assignee" text={task.assigneeName || "Unassigned"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created At" text={formatDate(task.createdAt)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Kaneo Web" url={openTask()} />

          <ActionPanel.Submenu title="Change Status…" icon={Icon.List} shortcut={ChangeStatus}>
            {columnStatuses
              .filter((status) => status.id !== task.status)
              .map((status) => {
                return (
                  <Action
                    key={status.id}
                    icon={status.isDone ? Icon.CircleProgress100 : Icon.Circle}
                    shortcut={
                      statusKey[status.id]
                        ? {
                            Windows: { modifiers: ["ctrl", "shift"], key: statusKey[status.id] },
                            macOS: { modifiers: ["cmd", "shift"], key: statusKey[status.id] },
                          }
                        : undefined
                    }
                    title={status.name}
                    onAction={() => handleStatusUpdate(task.id, status.id, task.title)}
                  />
                );
              })}
          </ActionPanel.Submenu>

          <ActionPanel.Submenu title="Change Priority…" icon={Icon.List} shortcut={ChangePriority}>
            {columnPriorities
              .filter((priority) => priority.id !== (task.priority || "no-priority"))
              .map((priority) => (
                <Action
                  key={priority.id}
                  icon={Icon.Circle}
                  shortcut={{
                    Windows: { modifiers: ["ctrl", "shift"], key: priorityKey[priority.id] ?? "p" },
                    macOS: { modifiers: ["cmd", "shift"], key: priorityKey[priority.id] ?? "p" },
                  }}
                  title={priority.name}
                  onAction={() => handlePriorityUpdate(task.id, priority.id, task.title)}
                />
              ))}
          </ActionPanel.Submenu>

          <Action.CopyToClipboard title="Copy Task Title" content={task.title} shortcut={CopyTaskTitle} />
          {task.description && (
            <Action.CopyToClipboard
              title="Copy Task Description"
              content={cleanDescription(task.description)}
              shortcut={CopyTaskDescription}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function ProjectTasksList({ project }: { project: Project }) {
  const api = new KaneoAPI();
  const { sort } = getPreferenceValues<{
    sort: string;
  }>();
  const {
    isLoading,
    data: projectDetail,
    revalidate,
  } = usePromise((id: string) => api.getProjectTasks(id), [project.id.toString()]);

  const priorityOrder = ["urgent", "high", "medium", "low", "no-priority"];

  const sortTasksByPriority = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      const aPriority = a.priority || "no-priority";
      const bPriority = b.priority || "no-priority";

      const aIndex = priorityOrder.indexOf(aPriority);
      const bIndex = priorityOrder.indexOf(bPriority);

      const aOrder = aIndex === -1 ? priorityOrder.length : aIndex;
      const bOrder = bIndex === -1 ? priorityOrder.length : bIndex;

      return aOrder - bOrder;
    });
  };

  const sortTasksByDueDate = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      const aDueDate = a.dueDate || "";
      const bDueDate = b.dueDate || "";
      return new Date(aDueDate).getTime() - new Date(bDueDate).getTime();
    });
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, taskTitle: string) => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Updating task status...",
    });

    try {
      await api.updateTaskStatus(taskId, newStatus);

      showToast(Toast.Style.Success, "Task status updated", `"${taskTitle}" moved to ${newStatus}`);

      await revalidate();
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to update task status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const updateTaskPriority = async (taskId: string, newPriority: string, taskTitle: string) => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Updating task priority...",
    });

    try {
      await api.updateTaskPriority(taskId, newPriority);

      showToast(Toast.Style.Success, "Task priority updated", `"${taskTitle}" set to ${newPriority}`);

      await revalidate();
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to update task priority",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const deleteTask = async (taskId: string, taskTitle: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Task",
      message: `Are you sure you want to delete "${taskTitle}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting task...",
    });

    try {
      await api.deleteTask(taskId);

      showToast(Toast.Style.Success, "Task deleted", `"${taskTitle}" deleted`);

      await revalidate();
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to delete task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const columnStatuses =
    projectDetail?.columns.map((col) => ({
      id: col.id,
      name: col.name,
      isDone: col.isFinal,
    })) || [];

  const columnPriorities: Array<{ id: string; name: string }> = [
    { id: "no-priority", name: "No priority" },
    { id: "low", name: "Low" },
    { id: "medium", name: "Medium" },
    { id: "high", name: "High" },
    { id: "urgent", name: "Urgent" },
  ];

  if (isLoading || !projectDetail) {
    return <List isLoading navigationTitle={`Tasks - ${project.name}`} />;
  }

  return (
    <List
      navigationTitle={`Tasks - ${project.name}`}
      searchBarPlaceholder="Search tasks..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Task"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={
              <CreateTaskForm
                projectId={project.id.toString()}
                columnStatuses={columnStatuses}
                onTaskCreated={revalidate}
              />
            }
          />
        </ActionPanel>
      }
    >
      {projectDetail.columns.map((column) => {
        const tasks = sort === "priority" ? sortTasksByPriority(column.tasks) : sortTasksByDueDate(column.tasks);

        return (
          <List.Section key={column.id} title={column.name}>
            {tasks.map((item) => {
              const priorityRaw = item.priority || "no-priority";
              const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

              return (
                <List.Item
                  key={item.id}
                  icon={column.isFinal ? Icon.CircleProgress100 : Icon.Circle}
                  title={item.title}
                  accessories={[
                    { text: item.assigneeName || "Unassigned", icon: Icon.Person },
                    ...(item.dueDate
                      ? [
                          {
                            tag: {
                              value: formatShortDate(item.dueDate),
                              color: (() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const dueDate = new Date(item.dueDate);
                                dueDate.setHours(0, 0, 0, 0);

                                const threeDaysFromNow = new Date(today);
                                threeDaysFromNow.setDate(today.getDate() + 3);

                                if (dueDate < today) {
                                  return Color.Red;
                                } else if (dueDate <= threeDaysFromNow) {
                                  return Color.Orange;
                                } else {
                                  return Color.Green;
                                }
                              })(),
                            },
                            tooltip: "Due Date",
                          },
                        ]
                      : []),
                    {
                      tag: priorityRaw
                        ? {
                            value: capitalize(priorityRaw).replaceAll("-", " "),
                            color: priorityColor[priorityRaw],
                          }
                        : undefined,
                      tooltip: "Priority",
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Open Task"
                        icon={Icon.Binoculars}
                        target={
                          <TaskDetailView
                            taskId={item.id}
                            projectId={project.id.toString()}
                            columnStatuses={columnStatuses}
                            columnPriorities={columnPriorities}
                            onStatusUpdate={updateTaskStatus}
                            onPriorityUpdate={updateTaskPriority}
                          />
                        }
                        onPop={revalidate}
                      />

                      <Action.Push
                        title="Create Task"
                        icon={Icon.Plus}
                        shortcut={Keyboard.Shortcut.Common.New}
                        target={
                          <CreateTaskForm
                            projectId={project.id.toString()}
                            columnStatuses={columnStatuses}
                            onTaskCreated={revalidate}
                          />
                        }
                        onPop={revalidate}
                      />

                      <Action
                        title="Delete Task"
                        style={Action.Style.Destructive}
                        icon={Icon.Trash}
                        onAction={() => deleteTask(item.id, item.title)}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                      />

                      <ActionPanel.Submenu title="Change Status…" icon={Icon.List} shortcut={ChangeStatus}>
                        {columnStatuses
                          .filter((status) => status.id !== item.status)
                          .map((status) => {
                            return (
                              <Action
                                key={status.id}
                                icon={status.isDone ? Icon.CircleProgress100 : Icon.Circle}
                                shortcut={
                                  statusKey[status.id]
                                    ? {
                                        Windows: { modifiers: ["ctrl", "shift"], key: statusKey[status.id] },
                                        macOS: { modifiers: ["cmd", "shift"], key: statusKey[status.id] },
                                      }
                                    : undefined
                                }
                                title={status.name}
                                onAction={() => updateTaskStatus(item.id, status.id, item.title)}
                              />
                            );
                          })}
                      </ActionPanel.Submenu>

                      <ActionPanel.Submenu title="Change Priority…" icon={Icon.List} shortcut={ChangePriority}>
                        {columnPriorities
                          .filter((priority) => priority.id !== (item.priority || "no-priority"))
                          .map((priority) => (
                            <Action
                              key={priority.id}
                              icon={Icon.Circle}
                              shortcut={{
                                Windows: { modifiers: ["ctrl", "shift"], key: priorityKey[priority.id] ?? "p" },
                                macOS: { modifiers: ["cmd", "shift"], key: priorityKey[priority.id] ?? "p" },
                              }}
                              title={priority.name}
                              onAction={() => updateTaskPriority(item.id, priority.id, item.title)}
                            />
                          ))}
                      </ActionPanel.Submenu>

                      <Action.CopyToClipboard title="Copy Task Title" content={item.title} shortcut={CopyTaskTitle} />

                      {item.description && (
                        <Action.CopyToClipboard
                          title="Copy Task Description"
                          content={cleanDescription(item.description)}
                          shortcut={CopyTaskDescription}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

export default function Command() {
  const api = new KaneoAPI();
  const { workspaceId } = getPreferenceValues<{
    workspaceId: string;
  }>();

  const {
    isLoading,
    data: projects = [],
    error,
    revalidate,
  } = usePromise((workspaceId: string) => api.getProjects(workspaceId), [workspaceId]);

  if (error) {
    const isUnauthorized = error.message.includes("Unauthorized") || error.message.includes("401");

    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={isUnauthorized ? "Authentication Failed" : "Error Loading Projects"}
          description={
            isUnauthorized
              ? "Your API token appears to be invalid or expired.\nPlease check your extension settings."
              : `Failed to load projects: ${error.message}`
          }
          actions={
            <ActionPanel>
              <Action title="Open Raycast Preferences" onAction={openExtensionPreferences} />
              <Action.CopyToClipboard title="Copy Error Message" content={error.message} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const deleteProject = async (workspaceId: string, projectId: number, projectName: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Project",
      message: `Are you sure you want to delete "${projectName}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting project...",
    });

    try {
      await api.deleteProject(projectId);

      toast.style = Toast.Style.Success;
      toast.title = "Project deleted";

      await revalidate();
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to delete project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Project"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CreateProjectForm onProjectCreated={revalidate} />}
          />
        </ActionPanel>
      }
    >
      {projects.map((item: Project) => {
        const statistics = item.statistics;
        const donePercentage = statistics.completionPercentage;
        const totalTasks = statistics.totalTasks;

        return (
          <List.Item
            key={item.id}
            icon={Icon.Folder}
            title={item.name}
            subtitle={item.description}
            keywords={[item.description || ""]}
            accessories={[
              {
                tag: {
                  value: `${totalTasks} task${totalTasks === 1 ? "" : "s"}`,
                  color: Color.SecondaryText,
                },
                tooltip: "Tasks",
              },
              {
                tag: {
                  value: `${donePercentage.toFixed(0)}% done`,
                  color:
                    donePercentage < 25
                      ? Color.Red
                      : donePercentage < 50
                        ? Color.Orange
                        : donePercentage < 75
                          ? Color.Yellow
                          : Color.Green,
                },
                tooltip: "Done",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Open ${item.name}`}
                  icon={Icon.AppWindow}
                  target={<ProjectTasksList project={item} />}
                  onPop={revalidate}
                />
                <Action.Push
                  title="Create Project"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<CreateProjectForm onProjectCreated={revalidate} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Project"
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => deleteProject(workspaceId, item.id, item.name)}
                />
                <Action.CopyToClipboard title="Copy Project Name" content={item.name} shortcut={CopyProjectName} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
