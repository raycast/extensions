import {
  Action,
  ActionPanel,
  Form,
  LaunchProps,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm, usePromise } from "@raycast/utils";
import fetch from "node-fetch";
import { getProjects, getTasks, getTypesOfWork, task } from "./composables/FetchData";
import { convertDurationsToSeconds, validateDuration } from "./composables/ValidateDuration";
import { baseURI, getTokens } from "./composables/WebClient";

interface FormValues {
  note: string;
  projectId: string;
  taskId: string;
  typeOfWorkId: string;
  date: Date | null;
  startTime: string;
  duration: string;
  isBillable: boolean;
}

const logTime = async (token: string, values: FormValues, tasks: task[] | string) => {
  values.date = values.date ? values.date : new Date();
  if (!Array.isArray(tasks)) {
    return;
  }
  const task = tasks.filter((value) => value.id === values.taskId)[0];
  const body = JSON.stringify({
    note: values.note,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    typeOfWorkId: values.typeOfWorkId,
    userId: (await LocalStorage.getItem<string>("userId"))?.valueOf(),
    projectId: values.projectId !== "none" ? values.projectId : task.projectId,
    taskId: values.taskId !== "none" ? values.taskId : undefined,
    StartDateLocal: `${values.date?.getFullYear()}-${String(values.date?.getMonth() + 1).padStart(2, "0")}-${String(values.date?.getDate()).padStart(2, "0")}`,
    StartTimeLocal: values.startTime
      ? values.startTime.includes("now")
        ? new Date().toLocaleTimeString("de-DE")
        : values.startTime
      : undefined,
    Duration: convertDurationsToSeconds(values.duration),
    isBillable: values.isBillable,
  });

  try {
    const response = await fetch(`${baseURI}/timeentries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body,
      redirect: "follow",
    });
    if (!response.ok) {
      showFailureToast("Couldn't log time");
    } else {
      await showHUD("Successfully logged time");
    }
  } catch (error) {
    showFailureToast(error as Error);
    console.error(error);
    return;
  }
};

export default function Command(props: LaunchProps) {
  const { data: token, revalidate } = usePromise(getTokens, [], {
    onData: (data) => {
      if (!data || data.isExpired()) {
        revalidate();
      }
    },
  });
  const {
    data: projects,
    isLoading: isLoadingProjects,
    revalidate: revalidateProjects,
  } = useCachedPromise(getProjects, [token?.accessToken as string, "", 1000], {
    execute: !!token?.accessToken && !token.isExpired(),
    onData: (data) => {
      if (!data || data.length === 0) {
        revalidateProjects();
      }
      if (props.launchContext?.projectId) {
        setValue("projectId", props.launchContext.projectId);
      }
      if (props.draftValues?.projectId) {
        setValue("projectId", props.draftValues.projectId);
      }
    },
    onError: () => {
      revalidateProjects();
    },
  });
  const {
    data: tasks,
    isLoading: isLoadingTasks,
    revalidate: revalidateTasks,
  } = useCachedPromise(getTasks, [token?.accessToken as string, "", 1000], {
    execute: !!token?.accessToken && !token.isExpired(),
    onData: (data) => {
      if (!data || data.length === 0) {
        revalidateTasks();
      }
      if (props.launchContext?.taskId) {
        setValue("taskId", props.launchContext.taskId);
      }
      if (props.draftValues?.taskId) {
        setValue("taskId", props.draftValues.taskId);
      }
    },
    onError: () => {
      revalidateTasks();
    },
  });
  const {
    data: typesOfWork,
    isLoading: isLoadingTypesOwWork,
    revalidate: revalidateTypesOfWork,
  } = useCachedPromise(getTypesOfWork, [token?.accessToken as string], {
    execute: !!token?.accessToken && !token.isExpired(),
    onData: (data) => {
      if (!Array.isArray(data)) {
        revalidateTypesOfWork();
      }
      if (props.launchContext?.typeOfWorkId) {
        setValue("typeOfWorkId", props.launchContext.typeOfWorkId);
      }
      if (props.draftValues?.typeOfWorkId) {
        setValue("typeOfWorkId", props.draftValues.typeOfWorkId);
      }
    },
    onError: () => {
      revalidateTypesOfWork();
    },
  });
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, setValidationError, setValue, values } = useForm<FormValues>({
    onSubmit: async (values) => {
      if (Array.isArray(tasks)) {
        await logTime(token?.accessToken as string, values, tasks);
        pop();
      } else {
        showToast({
          title: "Failed to log time",
          message: `Expected tasks to be an array, but found ${typeof tasks}`,
          style: Toast.Style.Failure,
        });
      }
    },
    initialValues: {
      date: new Date(),
      isBillable: true,
      ...props.draftValues,
    },
    validation: {
      projectId: (value) => {
        if ((!value || value === "none") && values.taskId === "none") {
          return "Please select a project";
        }
      },
      typeOfWorkId: FormValidation.Required,
      date: FormValidation.Required,
      duration: validateDuration,
      startTime: (value) => {
        if (value) {
          if (value.match(/^ *(([0-1]?\d)|(2[0-3])):[0-5]\d *$/)) {
            return;
          } else if (value.match(/^ *now *$/i)) {
            return;
          }
          return "Please use format hh:mm";
        }
      },
    },
  });

  return (
    <Form
      enableDrafts={true}
      isLoading={isLoadingTypesOwWork || isLoadingProjects || isLoadingTasks}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title={"Note"} {...itemProps.note} placeholder="What did you work on?" />
      <Form.Dropdown
        title={"Project"}
        {...itemProps.projectId}
        onChange={(projectId) => {
          setValidationError("projectId", undefined);
          if (projectId && Array.isArray(projects)) {
            setValue("projectId", projectId);
            const project = projects.filter((value) => value.id === projectId)[0];
            if (typeof project?.isBillableByDefault === "boolean") {
              setValue("isBillable", project.isBillableByDefault);
            }
          }
        }}
      >
        <Form.Dropdown.Item key={"none"} title={"No Project"} value={"none"} />
        {projects &&
          Array.isArray(projects) &&
          projects.map((project) => <Form.Dropdown.Item key={project.id} title={project.name} value={project.id} />)}
      </Form.Dropdown>
      <Form.Dropdown
        title={"Task"}
        {...itemProps.taskId}
        onChange={(taskId) => {
          if (taskId && Array.isArray(tasks)) {
            setValue("taskId", taskId);
            const task = tasks.filter((value) => taskId === value.id)[0];
            setValue("projectId", task?.projectId || "");
            setValidationError("projectId", undefined);
            if (task?.typeOfWorkId) {
              setValue("typeOfWorkId", task.typeOfWorkId);
            }
            if (typeof task?.project.isBillableByDefault === "boolean") {
              setValue("isBillable", task.project.isBillableByDefault);
            }
          }
        }}
      >
        <Form.Dropdown.Item key={"none"} title={"No Task"} value={"none"} />
        {tasks &&
          Array.isArray(tasks) &&
          tasks
            .filter(
              (task) =>
                !itemProps.projectId ||
                itemProps.projectId.value === "none" ||
                task.projectId.includes(itemProps.projectId.value || ""),
            )
            .map((task) => <Form.Dropdown.Item key={task.id} title={task.name} value={task.id} />)}
      </Form.Dropdown>
      <Form.Dropdown title={"Type of work"} {...itemProps.typeOfWorkId}>
        {typesOfWork &&
          Array.isArray(typesOfWork) &&
          typesOfWork.map((typeOfWork) => (
            <Form.Dropdown.Item key={typeOfWork.id} title={typeOfWork.name} value={typeOfWork.id} />
          ))}
      </Form.Dropdown>
      <Form.DatePicker type={Form.DatePicker.Type.Date} {...itemProps.date} />
      <Form.TextField
        title={"Start time"}
        {...itemProps.startTime}
        info={"Format hh:mm"}
        placeholder={new Date().toLocaleTimeString("de-DE").slice(0, 5)}
      />
      <Form.TextField title={"Duration"} {...itemProps.duration} placeholder="1h 30m" />
      <Form.Checkbox {...itemProps.isBillable} label={"Billable"} />
    </Form>
  );
}
