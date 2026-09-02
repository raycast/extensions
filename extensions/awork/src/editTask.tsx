import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  Form,
  Icon,
  LocalStorage,
  open,
  PopToRootType,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import { getSelectableParentTasks } from "./composables/CreateTaskDraft";
import { buildEditTaskValues, EditableTask, getTask, updateTask, validateEditTaskParent } from "./composables/EditTask";
import {
  getPrivateTaskStatuses,
  getProjectMembers,
  getTaskLists,
  getTasks,
  getTaskStatuses,
  getTypesOfWork,
} from "./composables/FetchData";
import { CreateTaskValues } from "./composables/TaskPayload";
import { validateDuration } from "./composables/ValidateDuration";
import { getTokens, onTokenChange } from "./composables/WebClient";

interface EditTaskProps {
  taskId: string;
  onUpdated?: () => void | Promise<void>;
}

const optionalDuration = (value?: string) => (value?.trim() ? validateDuration(value) : undefined);

const getAssigneeName = (firstName?: string | null, lastName?: string | null) =>
  [firstName, lastName]
    .map((namePart) => namePart?.trim())
    .filter((namePart): namePart is string => Boolean(namePart))
    .join(" ") || "Unnamed User";

export default function EditTask(props: EditTaskProps) {
  const { data: token, revalidate: revalidateToken } = usePromise(getTokens);
  const {
    data: task,
    error,
    isLoading,
    revalidate: revalidateTask,
  } = usePromise(getTask, [token?.accessToken as string, props.taskId], {
    execute: !!token?.accessToken && !token.isExpired(),
  });

  useEffect(() => onTokenChange(revalidateToken), [revalidateToken]);

  if (error) {
    return (
      <Detail
        markdown={`# Couldn't load task\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidateTask} />
          </ActionPanel>
        }
      />
    );
  }

  if (!task || !token?.accessToken) return <Detail isLoading={isLoading || !token} markdown="Loading task…" />;

  return <EditTaskForm task={task} accessToken={token.accessToken} onUpdated={props.onUpdated} />;
}

function EditTaskForm(props: { task: EditableTask; accessToken: string; onUpdated?: EditTaskProps["onUpdated"] }) {
  const { pop } = useNavigation();
  const submitMode = useRef<"save" | "saveAndOpen">("save");
  const isSubmitting = useRef(false);
  const initialValues = useMemo(() => buildEditTaskValues(props.task), [props.task]);
  const projectId = initialValues.projectId;

  const { handleSubmit, itemProps, setValue, values } = useForm<CreateTaskValues>({
    onSubmit: async (formValues) => {
      // Saving runs several sequential API requests; ignore repeated submits so
      // a second ⌘⏎ doesn't apply the same changes twice in parallel.
      if (isSubmitting.current) return false;
      isSubmitting.current = true;
      try {
        if (formValues.startOn && formValues.dueOn && formValues.dueOn < formValues.startOn) {
          await showFailureToast("The due date cannot be before the start date");
          return;
        }

        if (formValues.parentTaskId !== "none" && formValues.parentTaskId !== props.task.parentId) {
          const parentTask = selectableParentTasks.find((task) => task.id === formValues.parentTaskId);
          try {
            validateEditTaskParent(props.task, parentTask, formValues.parentTaskId);
          } catch (error) {
            await showFailureToast(error, { title: "Invalid parent task" });
            return;
          }
        }

        try {
          await updateTask(props.accessToken, props.task, formValues);
          await props.onUpdated?.();
        } catch (error) {
          await showFailureToast(error, { title: "Couldn't update task" });
          return;
        }

        const taskTitle = props.task.taskIdentifier ?? formValues.name.trim();
        if (submitMode.current === "saveAndOpen") {
          try {
            const workspaceUrl = await LocalStorage.getItem<string>("URL");
            if (!workspaceUrl) throw new Error("The awork workspace URL is unavailable");
            await open(`${workspaceUrl.replace(/\/$/, "")}/tasks/${props.task.id}`);
          } catch (error) {
            await showFailureToast(error, { title: "Task updated, but couldn't open it" });
          }
          await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
          return;
        }

        await showToast({ style: Toast.Style.Success, title: `Updated ${taskTitle}` });
        pop();
      } finally {
        isSubmitting.current = false;
      }
    },
    initialValues,
    validation: {
      name: (value) => {
        if (!value?.trim()) return "Please enter a task name";
        if (value.trim().length > 1000) return "The task name can contain at most 1,000 characters";
      },
      description: (value) =>
        value && value.length > 25000 ? "The description can contain at most 25,000 characters" : undefined,
      taskStatusId: (value) => (!value || value === "none" ? "Please select a status" : undefined),
      typeOfWorkId: (value) => (!value || value === "none" ? "Please select a type of work" : undefined),
      plannedDuration: optionalDuration,
    },
  });

  const { data: projectTaskStatuses, isLoading: isLoadingProjectTaskStatuses } = useCachedPromise(
    getTaskStatuses,
    [props.accessToken, projectId],
    { execute: projectId !== "none" },
  );
  const { data: privateTaskStatuses, isLoading: isLoadingPrivateTaskStatuses } = useCachedPromise(
    getPrivateTaskStatuses,
    [props.accessToken],
    { execute: projectId === "none" },
  );
  const { data: taskLists, isLoading: isLoadingTaskLists } = useCachedPromise(
    getTaskLists,
    [props.accessToken, projectId],
    { execute: projectId !== "none" },
  );
  const { data: parentTasks, isLoading: isLoadingParentTasks } = useCachedPromise(
    getTasks,
    [props.accessToken, "", 1000, projectId, { includeDone: true }],
    { execute: projectId !== "none" },
  );
  const { data: typesOfWork, isLoading: isLoadingTypesOfWork } = useCachedPromise(getTypesOfWork, [props.accessToken]);
  const { data: projectMembers, isLoading: isLoadingProjectMembers } = useCachedPromise(
    getProjectMembers,
    [props.accessToken, projectId],
    { execute: projectId !== "none" },
  );

  const taskStatuses = projectId === "none" ? privateTaskStatuses : projectTaskStatuses;
  const selectableParentTasks = getSelectableParentTasks(parentTasks).filter((task) => task.id !== props.task.id);
  const hasParentTaskValue =
    values.parentTaskId === "none" || selectableParentTasks.some((task) => task.id === values.parentTaskId);
  const hasTaskListValue = values.taskListId === "none" || taskLists?.some((list) => list.id === values.taskListId);
  const hasTaskStatusValue = taskStatuses?.some((status) => status.id === values.taskStatusId);
  const hasTypeOfWorkValue =
    Array.isArray(typesOfWork) && typesOfWork.some((typeOfWork) => typeOfWork.id === values.typeOfWorkId);
  const taskHasSubtasks = (props.task.numberOfSubtasks ?? 0) > 0;

  const assigneeOptions = useMemo(() => {
    const options = new Map<string, { id: string; name: string }>();
    projectMembers?.forEach((member) =>
      options.set(member.userId, {
        id: member.userId,
        name: getAssigneeName(member.firstName, member.lastName),
      }),
    );
    props.task.assignees?.forEach((assignee) => {
      const id = assignee.userId ?? assignee.id;
      if (!options.has(id)) {
        options.set(id, { id, name: getAssigneeName(assignee.firstName, assignee.lastName) });
      }
    });
    return [...options.values()];
  }, [projectMembers, props.task.assignees]);

  return (
    <Form
      navigationTitle="Edit Task"
      isLoading={
        isLoadingProjectTaskStatuses ||
        isLoadingPrivateTaskStatuses ||
        isLoadingTaskLists ||
        isLoadingParentTasks ||
        isLoadingTypesOfWork ||
        isLoadingProjectMembers
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm<CreateTaskValues>
            title="Save Task"
            icon={Icon.Checkmark}
            onSubmit={async (formValues) => {
              submitMode.current = "save";
              return handleSubmit(formValues);
            }}
          />
          <Action.SubmitForm<CreateTaskValues>
            title="Save and Open in Browser"
            icon={Icon.Globe}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "enter" },
              Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
            }}
            onSubmit={async (formValues) => {
              submitMode.current = "saveAndOpen";
              try {
                return await handleSubmit(formValues);
              } finally {
                submitMode.current = "save";
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Task name" placeholder="Task name" {...itemProps.name} />
      <Form.Dropdown title="Project" info="The project cannot be changed while editing a task" {...itemProps.projectId}>
        <Form.Dropdown.Item
          title={projectId === "none" ? "No project (private task)" : (props.task.project?.name ?? "Current project")}
          value={projectId}
        />
      </Form.Dropdown>
      {projectId === "none" ? (
        <Form.Dropdown title="Nest under task" {...itemProps.parentTaskId}>
          <Form.Dropdown.Item title="Not available for private tasks" value="none" />
        </Form.Dropdown>
      ) : taskHasSubtasks ? (
        <Form.Dropdown
          title="Nest under task"
          info="A task with subtasks cannot be nested under another task"
          {...itemProps.parentTaskId}
        >
          <Form.Dropdown.Item
            title={values.parentTaskId === "none" ? "No parent task (task has subtasks)" : "Current parent task"}
            value={values.parentTaskId}
          />
        </Form.Dropdown>
      ) : (
        <Form.Dropdown
          title="Nest under task"
          {...itemProps.parentTaskId}
          onChange={(parentTaskId) => {
            if (parentTaskId === values.parentTaskId) return;
            setValue("parentTaskId", parentTaskId);
            const parentTask = selectableParentTasks.find((task) => task.id === parentTaskId);
            if (parentTask?.typeOfWorkId) setValue("typeOfWorkId", parentTask.typeOfWorkId);
          }}
        >
          <Form.Dropdown.Item title="No parent task" value="none" />
          {!hasParentTaskValue && values.parentTaskId !== "none" && (
            <Form.Dropdown.Item
              title={props.task.parentTask?.name ?? "Current parent task"}
              value={values.parentTaskId}
            />
          )}
          {selectableParentTasks.map((task) => (
            <Form.Dropdown.Item
              key={task.id}
              title={task.name}
              value={task.id}
              keywords={[task.taskIdentifier ?? ""]}
            />
          ))}
        </Form.Dropdown>
      )}
      {projectId === "none" ? (
        <Form.Dropdown title="Task list" {...itemProps.taskListId}>
          <Form.Dropdown.Item title="Not available for private tasks" value="none" />
        </Form.Dropdown>
      ) : (
        <Form.Dropdown title="Task list" {...itemProps.taskListId}>
          <Form.Dropdown.Item title="No task list" value="none" />
          {!hasTaskListValue && values.taskListId !== "none" && (
            <Form.Dropdown.Item title="Current task list" value={values.taskListId} />
          )}
          {taskLists?.map((taskList) => (
            <Form.Dropdown.Item key={taskList.id} title={taskList.name} value={taskList.id} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown title="Status" {...itemProps.taskStatusId}>
        {!hasTaskStatusValue && <Form.Dropdown.Item title="Current status" value={values.taskStatusId} />}
        {taskStatuses?.map((status) => (
          <Form.Dropdown.Item key={status.id} title={status.name} value={status.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Type of work" {...itemProps.typeOfWorkId}>
        {!hasTypeOfWorkValue && <Form.Dropdown.Item title="Current type of work" value={values.typeOfWorkId} />}
        {Array.isArray(typesOfWork) &&
          typesOfWork.map((typeOfWork) => (
            <Form.Dropdown.Item key={typeOfWork.id} title={typeOfWork.name} value={typeOfWork.id} />
          ))}
      </Form.Dropdown>
      {projectId === "none" ? (
        <Form.TagPicker title="Assignees" placeholder="Not available for private tasks" {...itemProps.assigneeIds} />
      ) : (
        <Form.TagPicker title="Assignees" {...itemProps.assigneeIds}>
          {assigneeOptions.map((assignee) => (
            <Form.TagPicker.Item key={assignee.id} title={assignee.name} value={assignee.id} />
          ))}
        </Form.TagPicker>
      )}
      <Form.TextArea title="Description" placeholder="Add details or acceptance criteria" {...itemProps.description} />
      <Form.Separator />
      <Form.DatePicker
        title="Start date"
        type={Form.DatePicker.Type.Date}
        {...itemProps.startOn}
        onChange={(startOn) => {
          if (startOn?.getTime() === values.startOn?.getTime()) return;
          setValue("startOn", startOn);
          if (startOn && !values.dueOn) setValue("dueOn", new Date(startOn));
        }}
      />
      <Form.DatePicker title="Due date" type={Form.DatePicker.Type.Date} {...itemProps.dueOn} />
      <Form.TextField title="Planned effort" placeholder="1h 30m" {...itemProps.plannedDuration} />
      <Form.Checkbox label="Prio" {...itemProps.isPrio} />
    </Form>
  );
}
