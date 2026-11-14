import {
  ActionPanel,
  Action,
  Icon,
  Image,
  List,
  getPreferenceValues,
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
import { useForm, FormValidation, showFailureToast, usePromise, getAvatarIcon } from "@raycast/utils";
import {
  ChangeStatus,
  ChangePriority,
  CopyTaskTitle,
  CopyTaskDescription,
  CopyProjectName,
  AssignTask,
  Revalidate,
} from "./shortcut";
import {
  Project,
  Task,
  CreateProjectFormValues,
  CreateTaskFormValues,
  ProjectDetail,
  CustomFieldDefinition,
} from "./types";
import { KaneoAPI } from "./api/kaneo";
import { useAuthSession } from "./hooks/useAuthSession";
import { TaskDetailView } from "./components/TaskDetailView";
import {
  formatShortDate,
  cleanDescription,
  statusKey,
  priorityKey,
  priorityColor,
  columnPriorities,
  sortTasksByPriority,
  sortTasksByDueDate,
  dueDateColor,
  resolveColumns,
} from "./lib/task-helpers";
import { useEffect, useMemo, useState } from "react";
import { resolveImageUrl } from "./lib/get-api-url";
import { sortCustomFields } from "./lib/custom-field-helpers";

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
      slug: (value) => {
        if (!value) {
          return "Slug is required";
        }
        if (value.length > 8) {
          return "Slug must be at most 8 characters long";
        }
        return undefined;
      },
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

// ---------- Custom fields (helpers du formulaire de création) ----------

type CustomValue = string | boolean | string[] | Date | null;

// Les options peuvent arriver en string[] ou en JSON string selon l'API
const getFieldOptions = (field: CustomFieldDefinition): string[] => {
  const raw = (field as { options?: unknown }).options;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getInitialCustomValue = (field: CustomFieldDefinition): CustomValue => {
  const def = (field as { defaultValue?: unknown }).defaultValue;
  switch (field.type) {
    case "checkbox":
      return def === true || def === "true";
    case "date": {
      const d = def ? new Date(String(def)) : null;
      return d && !Number.isNaN(d.getTime()) ? d : null;
    }
    case "multiselect":
      return Array.isArray(def) ? def.map(String) : [];
    default:
      return def === undefined || def === null ? "" : String(def);
  }
};

const isEmptyCustomValue = (v: CustomValue) => v === null || v === "" || (Array.isArray(v) && v.length === 0);

// L'API Kaneo attend TOUJOURS des strings pour les valeurs de custom fields
const serializeCustomValue = (v: CustomValue): string => {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return JSON.stringify(v); // multiselect -> '["6","8","4"]'
  if (typeof v === "boolean") return String(v); // checkbox -> "true" / "false"
  return String(v ?? ""); // number, text, dropdown -> string
};

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
  const kaneoApi = useMemo(() => new KaneoAPI(), []);

  const { isLoading: isLoadingFields, data: rawFields } = usePromise(
    (id: string) => kaneoApi.getCustomFields(id),
    [projectId],
  );
  const customFields = useMemo(() => sortCustomFields(rawFields ?? []), [rawFields]);

  const [customValues, setCustomValues] = useState<Record<string, CustomValue>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string | undefined>>({});

  const getCustomValue = (field: CustomFieldDefinition): CustomValue =>
    field.id in customValues ? customValues[field.id] : getInitialCustomValue(field);

  const setCustomValue = (fieldId: string, value: CustomValue) => {
    setCustomValues((prev) => ({ ...prev, [fieldId]: value }));
    setCustomErrors((prev) => ({ ...prev, [fieldId]: undefined }));
  };

  const validateCustomFields = () => {
    const errors: Record<string, string> = {};
    for (const field of customFields) {
      const v = getCustomValue(field);
      if (field.required && field.type !== "checkbox" && isEmptyCustomValue(v)) {
        errors[field.id] = `${field.name} is required`;
      } else if (field.type === "number" && !isEmptyCustomValue(v) && Number.isNaN(Number(v))) {
        errors[field.id] = "Must be a number";
      }
    }
    setCustomErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const { handleSubmit, itemProps } = useForm<CreateTaskFormValues>({
    async onSubmit(values) {
      if (!validateCustomFields()) return;

      await showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });

      try {
        // Ne pas envoyer les champs vides (checkbox : seulement si cochée ou modifiée)
        const customFieldsPayload = customFields
          .filter((field) => {
            const v = getCustomValue(field);
            if (field.type === "checkbox") return v === true || field.id in customValues;
            return !isEmptyCustomValue(v);
          })
          .map((field) => ({
            fieldId: field.id,
            value: serializeCustomValue(getCustomValue(field)),
          }));

        // Une seule requête : la tâche et ses custom fields sont créés ensemble
        await kaneoApi.createTask(projectId, {
          title: values.title,
          description: values.description || "",
          status: values.status,
          priority: values.priority || "no-priority",
          ...(values.dueDate && { dueDate: values.dueDate.toISOString() }),
          customFields: customFieldsPayload,
        });

        await showToast(Toast.Style.Success, "Task created successfully");

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

  const renderCustomField = (field: CustomFieldDefinition) => {
    const id = `custom-${field.id}`;
    const title = field.required ? `${field.name} *` : field.name;
    const error = customErrors[field.id];
    const value = getCustomValue(field);
    const options = getFieldOptions(field);

    switch (field.type) {
      case "checkbox":
        return (
          <Form.Checkbox
            key={field.id}
            id={id}
            title={title}
            label=""
            error={error}
            value={value === true}
            onChange={(v) => setCustomValue(field.id, v)}
          />
        );
      case "date":
        return (
          <Form.DatePicker
            key={field.id}
            id={id}
            title={title}
            error={error}
            value={value instanceof Date ? value : null}
            onChange={(v) => setCustomValue(field.id, v)}
          />
        );
      case "multiselect":
        return (
          <Form.TagPicker
            key={field.id}
            id={id}
            title={title}
            error={error}
            value={Array.isArray(value) ? value : []}
            onChange={(v) => setCustomValue(field.id, v)}
          >
            {options.map((o) => (
              <Form.TagPicker.Item key={o} value={o} title={o} />
            ))}
          </Form.TagPicker>
        );
      case "dropdown":
        return (
          <Form.Dropdown
            key={field.id}
            id={id}
            title={title}
            error={error}
            value={typeof value === "string" ? value : ""}
            onChange={(v) => setCustomValue(field.id, v)}
          >
            <Form.Dropdown.Item value="" title="—" />
            {options.map((o) => (
              <Form.Dropdown.Item key={o} value={o} title={o} />
            ))}
          </Form.Dropdown>
        );
      default:
        return (
          <Form.TextField
            key={field.id}
            id={id}
            title={title}
            error={error}
            placeholder={field.type === "number" ? "Enter a number" : `Enter ${field.name.toLowerCase()}`}
            value={typeof value === "string" ? value : ""}
            onChange={(v) => setCustomValue(field.id, v)}
          />
        );
    }
  };

  return (
    <Form
      isLoading={isLoadingFields}
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

      {customFields.length > 0 && <Form.Separator />}
      {customFields.map(renderCustomField)}
    </Form>
  );
}

function ProjectTasksList({ project }: { project: Project }) {
  const api = new KaneoAPI();
  const { sort, youAsAssignee } = getPreferenceValues<Preferences>();
  const projectId = project.id.toString();

  const { isLoading, data: dProject, revalidate } = usePromise((id: string) => api.getProjectTasks(id), [projectId]);
  const { session } = useAuthSession();
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | undefined>(dProject);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const refresh = () => revalidate();

  useEffect(() => {
    if (dProject) {
      setProjectDetail(dProject);
    }
  }, [dProject]);

  if (isLoading || !projectDetail) {
    return <List isLoading navigationTitle={`Tasks - ${project.name}`} />;
  }

  const userId = session?.user?.id ?? null;

  const toggleAssignTask = async (task: Task) => {
    if (!userId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No session",
        message: "You must be logged in to assign tasks.",
      });
      return;
    }

    const isAssignedToMe = task.assigneeId === userId;

    await showToast({
      style: Toast.Style.Animated,
      title: isAssignedToMe ? "Unassigning task..." : "Assigning task...",
    });

    try {
      await api.assignTask(task.id, isAssignedToMe ? "" : userId);

      const newAssigneeId = isAssignedToMe ? null : userId;
      const newAssigneeName = isAssignedToMe ? null : (session?.user?.name ?? null);
      const newAssigneeImage = isAssignedToMe ? null : (session?.user?.image ?? null);

      setProjectDetail((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          data: prev.data
            ? {
                ...prev.data,
                columns: prev.data.columns.map((col) => ({
                  ...col,
                  tasks: col.tasks.map((t) =>
                    t.id === task.id
                      ? {
                          ...t,
                          assigneeId: newAssigneeId,
                          assigneeName: newAssigneeName,
                          assigneeImage: newAssigneeImage,
                        }
                      : t,
                  ),
                })),
              }
            : undefined,
          columns: !prev.data
            ? prev.columns?.map((col) => ({
                ...col,
                tasks: col.tasks.map((t) =>
                  t.id === task.id
                    ? {
                        ...t,
                        assigneeId: newAssigneeId,
                        assigneeName: newAssigneeName,
                        assigneeImage: newAssigneeImage,
                      }
                    : t,
                ),
              }))
            : undefined,
        };
      });

      await showToast({
        style: Toast.Style.Success,
        title: isAssignedToMe ? "Task unassigned" : "Task assigned to you",
      });
    } catch (error) {
      await showFailureToast(error, {
        title: isAssignedToMe ? "Failed to unassign task" : "Failed to assign task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
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

  const resolvedColumns = resolveColumns(projectDetail);

  const columnStatuses = resolvedColumns.map((col) => ({
    id: col.id,
    name: col.name,
    isDone: col.isFinal,
  }));

  return (
    <List
      isShowingDetail={isShowingDetail}
      navigationTitle={`Tasks - ${project.name}`}
      searchBarPlaceholder="Search tasks..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Task"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CreateTaskForm projectId={projectId} columnStatuses={columnStatuses} onTaskCreated={refresh} />}
          />
        </ActionPanel>
      }
    >
      {resolvedColumns.map((column) => {
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
                  accessories={
                    isShowingDetail
                      ? []
                      : [
                          {
                            text:
                              (youAsAssignee
                                ? item.assigneeId === userId
                                  ? "You"
                                  : item.assigneeName
                                : item.assigneeName) || "Unassigned",
                            icon: item.assigneeName
                              ? item.assigneeImage
                                ? { source: resolveImageUrl(item.assigneeImage), mask: Image.Mask.Circle }
                                : getAvatarIcon(`${item.assigneeName}`)
                              : undefined,
                          },
                          ...(item.dueDate
                            ? [
                                {
                                  tag: {
                                    value: formatShortDate(item.dueDate),
                                    color: dueDateColor(item.dueDate),
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
                        ]
                  }
                  detail={
                    <List.Item.Detail
                      markdown={item.description ? cleanDescription(item.description) : undefined}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Status" text={column.name} />
                          <List.Item.Detail.Metadata.Label
                            title="Priority"
                            text={capitalize(priorityRaw).replaceAll("-", " ")}
                          />
                          <List.Item.Detail.Metadata.Label title="Assignee" text={item.assigneeName || "Unassigned"} />
                          {item.dueDate && (
                            <List.Item.Detail.Metadata.Label title="Due Date" text={formatShortDate(item.dueDate)} />
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Open Task"
                        icon={Icon.Binoculars}
                        target={
                          <TaskDetailView
                            taskId={item.id}
                            projectId={projectId}
                            columnStatuses={columnStatuses}
                            columnPriorities={columnPriorities}
                            onStatusUpdate={updateTaskStatus}
                            onPriorityUpdate={updateTaskPriority}
                          />
                        }
                        onPop={refresh}
                      />

                      <Action
                        title={isShowingDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                        onAction={() => setIsShowingDetail((v) => !v)}
                      />

                      <Action.Push
                        title="Create Task"
                        icon={Icon.Plus}
                        shortcut={Keyboard.Shortcut.Common.New}
                        target={
                          <CreateTaskForm
                            projectId={projectId}
                            columnStatuses={columnStatuses}
                            onTaskCreated={refresh}
                          />
                        }
                        onPop={refresh}
                      />

                      <Action
                        title="Delete Task"
                        style={Action.Style.Destructive}
                        icon={Icon.Trash}
                        onAction={() => deleteTask(item.id, item.title)}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                      />

                      <Action
                        title={item.assigneeId === session?.user?.id ? "Unassign from Me" : "Assign to Me"}
                        icon={Icon.Person}
                        shortcut={AssignTask}
                        onAction={() => toggleAssignTask(item)}
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

                      <Action
                        title="Revalidate"
                        icon={Icon.RotateAntiClockwise}
                        shortcut={Revalidate}
                        onAction={() => refresh()}
                      />
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
