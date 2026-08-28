import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  LaunchProps,
  LocalStorage,
  open,
  PopToRootType,
  showHUD,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import { createTask } from "./composables/CreateTask";
import {
  findSelectableParentTask,
  getSelectableParentTasks,
  normalizeCreateTaskDraftValues,
  normalizeFormString,
} from "./composables/CreateTaskDraft";
import {
  getPrivateTaskStatuses,
  getProjectMembers,
  getProjects,
  getTaskLists,
  getTasks,
  getTaskStatuses,
  getTypesOfWork,
} from "./composables/FetchData";
import { CreateTaskValues } from "./composables/TaskPayload";
import { validateDuration } from "./composables/ValidateDuration";
import { getTokens, onTokenChange } from "./composables/WebClient";

const optionalDuration = (value?: string) => (value?.trim() ? validateDuration(value) : undefined);

const getAssigneeName = (firstName?: string | null, lastName?: string | null) =>
  [firstName, lastName]
    .map((namePart) => namePart?.trim())
    .filter((namePart): namePart is string => Boolean(namePart))
    .join(" ") || "Unnamed User";

export default function Command(props: LaunchProps) {
  const { data: token, revalidate: revalidateToken } = usePromise(getTokens);
  const submitMode = useRef<"create" | "createAndOpen">("create");
  const isSubmitting = useRef(false);
  const hasRestoredInitialParent = useRef(false);
  const draftValues = useMemo(() => normalizeCreateTaskDraftValues(props.draftValues), [props.draftValues]);
  const launchProjectId = normalizeFormString(props.launchContext?.projectId);
  const launchParentId = normalizeFormString(props.launchContext?.parentTaskId);

  useEffect(() => onTokenChange(revalidateToken), [revalidateToken]);

  const { handleSubmit, itemProps, setValue, values } = useForm<CreateTaskValues>({
    onSubmit: async (formValues) => {
      // Creating a task can take a moment; ignore repeated submits so a second
      // ⌘⏎ doesn't create the same task twice.
      if (isSubmitting.current) return false;
      isSubmitting.current = true;
      try {
        if (formValues.startOn && formValues.dueOn && formValues.dueOn < formValues.startOn) {
          await showFailureToast("The due date cannot be before the start date");
          return;
        }

        const accessToken = token?.accessToken ?? (await getTokens())?.accessToken;
        if (!accessToken) {
          await showFailureToast("Please connect your awork account and try again", { title: "Not signed in" });
          return;
        }

        let result;
        try {
          result = await createTask(accessToken, formValues);
        } catch (error) {
          await showFailureToast(error, { title: "Couldn't create task" });
          return;
        }

        const taskTitle = result.task.taskIdentifier ?? result.task.name;
        if (result.assigneeError) {
          await showFailureToast(result.assigneeError, {
            title: `${taskTitle} created without assignees`,
          });
        }

        if (submitMode.current === "createAndOpen") {
          try {
            const workspaceUrl = await LocalStorage.getItem<string>("URL");
            if (!workspaceUrl) throw new Error("The awork workspace URL is unavailable");

            await open(`${workspaceUrl.replace(/\/$/, "")}/tasks/${result.task.id}`);
          } catch (error) {
            await showFailureToast(error, { title: "Task created, but couldn't open it" });
          }

          await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        } else if (result.assigneeError) {
          await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        } else {
          await showHUD(`Created ${taskTitle}`, {
            clearRootSearch: true,
            popToRootType: PopToRootType.Immediate,
          });
        }
      } finally {
        isSubmitting.current = false;
      }
    },
    initialValues: {
      taskStatusId: "none",
      typeOfWorkId: "none",
      taskListId: "none",
      assigneeIds: [],
      startOn: null,
      dueOn: null,
      isPrio: false,
      ...draftValues,
      projectId: draftValues.projectId ?? "none",
      parentTaskId:
        draftValues.projectId && draftValues.projectId !== "none" ? (draftValues.parentTaskId ?? "none") : "none",
    },
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

  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(
    getProjects,
    [token?.accessToken as string, "", 1000],
    {
      execute: !!token?.accessToken && !token.isExpired(),
      onData: () => {
        const projectId = launchProjectId ?? draftValues.projectId;
        if (projectId && projectId !== "none") setValue("projectId", projectId);
      },
    },
  );
  const { data: projectTaskStatuses, isLoading: isLoadingProjectTaskStatuses } = useCachedPromise(
    getTaskStatuses,
    [token?.accessToken as string, values.projectId],
    {
      execute: !!token?.accessToken && !token.isExpired() && values.projectId !== "none",
    },
  );
  const { data: privateTaskStatuses, isLoading: isLoadingPrivateTaskStatuses } = useCachedPromise(
    getPrivateTaskStatuses,
    [token?.accessToken as string],
    { execute: !!token?.accessToken && !token.isExpired() && values.projectId === "none" },
  );
  const { data: taskLists, isLoading: isLoadingTaskLists } = useCachedPromise(
    getTaskLists,
    [token?.accessToken as string, values.projectId],
    {
      execute: !!token?.accessToken && !token.isExpired() && values.projectId !== "none",
    },
  );
  const { data: parentTasks, isLoading: isLoadingParentTasks } = useCachedPromise(
    getTasks,
    [token?.accessToken as string, "", 1000, values.projectId],
    {
      execute: !!token?.accessToken && !token.isExpired() && values.projectId !== "none",
      onData: (tasks) => {
        if (hasRestoredInitialParent.current) return;
        hasRestoredInitialParent.current = true;

        const parentId = launchParentId ?? draftValues.parentTaskId;
        if (!parentId || parentId === "none") return;

        const parentTask = findSelectableParentTask(tasks, parentId, values.projectId);
        if (!parentTask) {
          setValue("parentTaskId", "none");
          return;
        }

        setValue("parentTaskId", parentTask.id);
        if (launchParentId && parentTask.typeOfWorkId) {
          setValue("typeOfWorkId", parentTask.typeOfWorkId);
        }
      },
    },
  );
  const { data: typesOfWork, isLoading: isLoadingTypesOfWork } = useCachedPromise(
    getTypesOfWork,
    [token?.accessToken as string],
    { execute: !!token?.accessToken && !token.isExpired() },
  );
  const { data: projectMembers, isLoading: isLoadingProjectMembers } = useCachedPromise(
    getProjectMembers,
    [token?.accessToken as string, values.projectId],
    { execute: !!token?.accessToken && !token.isExpired() && values.projectId !== "none" },
  );
  const taskStatuses = values.projectId === "none" ? privateTaskStatuses : projectTaskStatuses;
  const selectableParentTasks = getSelectableParentTasks(parentTasks);
  const hasProjectValue = values.projectId === "none" || projects?.some((project) => project.id === values.projectId);
  const hasParentTaskValue =
    values.parentTaskId === "none" || selectableParentTasks.some((task) => task.id === values.parentTaskId);
  const hasTaskListValue =
    values.taskListId === "none" || taskLists?.some((taskList) => taskList.id === values.taskListId);
  const hasTaskStatusValue = taskStatuses?.some((status) => status.id === values.taskStatusId);
  const hasTypeOfWorkValue =
    Array.isArray(typesOfWork) && typesOfWork.some((typeOfWork) => typeOfWork.id === values.typeOfWorkId);

  useEffect(() => {
    if (taskStatuses?.length && !taskStatuses.some((status) => status.id === values.taskStatusId)) {
      setValue("taskStatusId", taskStatuses[0].id);
    }
  }, [setValue, taskStatuses, values.taskStatusId]);

  useEffect(() => {
    if (
      Array.isArray(typesOfWork) &&
      typesOfWork.length > 0 &&
      !typesOfWork.some((typeOfWork) => typeOfWork.id === values.typeOfWorkId)
    ) {
      setValue("typeOfWorkId", typesOfWork[0].id);
    }
  }, [setValue, typesOfWork, values.typeOfWorkId]);

  return (
    <Form
      enableDrafts
      isLoading={
        isLoadingProjects ||
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
            title="Create Task"
            onSubmit={async (formValues) => {
              submitMode.current = "create";
              return handleSubmit(formValues);
            }}
          />
          <Action.SubmitForm<CreateTaskValues>
            icon={Icon.Globe}
            title="Create and Open in Browser"
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "enter" },
              Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
            }}
            onSubmit={async (formValues) => {
              submitMode.current = "createAndOpen";
              try {
                return await handleSubmit(formValues);
              } finally {
                submitMode.current = "create";
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Task name" placeholder="Task name" {...itemProps.name} />
      <Form.Dropdown
        title="Project"
        {...itemProps.projectId}
        onChange={(projectId) => {
          // The dropdown also fires on mount; only reset the dependent fields
          // when the project actually changes so restored drafts survive.
          if (projectId === values.projectId) return;
          setValue("projectId", projectId);
          setValue("taskStatusId", "none");
          setValue("taskListId", "none");
          setValue("parentTaskId", "none");
          // Assignees are project members, so a previous selection is invalid in the new project.
          setValue("assigneeIds", []);
        }}
      >
        <Form.Dropdown.Item title="No project (private task)" value="none" />
        {!hasProjectValue && values.projectId !== "none" && (
          <Form.Dropdown.Item title="Loading selected project…" value={values.projectId} />
        )}
        {Array.isArray(projects) &&
          projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              title={project.name}
              value={project.id}
              keywords={[project.projectKey ?? "", project.company?.name ?? ""]}
            />
          ))}
      </Form.Dropdown>
      {values.projectId === "none" ? (
        <Form.Dropdown title="Nest under task" {...itemProps.parentTaskId}>
          <Form.Dropdown.Item title="Select a project first" value="none" />
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
            <Form.Dropdown.Item title="Loading selected parent task…" value={values.parentTaskId} />
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
      {values.projectId === "none" ? (
        <Form.Dropdown title="Task list" {...itemProps.taskListId}>
          <Form.Dropdown.Item title="Select a project first" value="none" />
        </Form.Dropdown>
      ) : (
        <Form.Dropdown title="Task list" {...itemProps.taskListId}>
          <Form.Dropdown.Item title="No task list" value="none" />
          {!hasTaskListValue && values.taskListId !== "none" && (
            <Form.Dropdown.Item title="Loading selected task list…" value={values.taskListId} />
          )}
          {taskLists?.map((taskList) => (
            <Form.Dropdown.Item key={taskList.id} title={taskList.name} value={taskList.id} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown title="Status" {...itemProps.taskStatusId}>
        {!hasTaskStatusValue && <Form.Dropdown.Item title="Loading statuses…" value={values.taskStatusId || "none"} />}
        {taskStatuses?.map((status) => (
          <Form.Dropdown.Item key={status.id} title={status.name} value={status.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Type of work" {...itemProps.typeOfWorkId}>
        {!hasTypeOfWorkValue && (
          <Form.Dropdown.Item title="Loading types of work…" value={values.typeOfWorkId || "none"} />
        )}
        {Array.isArray(typesOfWork) &&
          typesOfWork.map((typeOfWork) => (
            <Form.Dropdown.Item key={typeOfWork.id} title={typeOfWork.name} value={typeOfWork.id} />
          ))}
      </Form.Dropdown>
      {values.projectId === "none" ? (
        <Form.TagPicker title="Assignees" placeholder="Select a project first" {...itemProps.assigneeIds} />
      ) : (
        <Form.TagPicker title="Assignees" {...itemProps.assigneeIds}>
          {projectMembers?.map((member) => (
            <Form.TagPicker.Item
              key={member.userId}
              title={getAssigneeName(member.firstName, member.lastName)}
              value={member.userId}
            />
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
