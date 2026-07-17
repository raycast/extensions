import { Action, useNavigation, ActionPanel, Form, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { MutatePromise, useForm, FormValidation, useFetch } from "@raycast/utils";
import { Page, UniversalInboxPreferences } from "../types";
import { default as dayjs, extend } from "dayjs";
import { Notification } from "../notification";
import { TaskPriority } from "../task";
import { handleErrors } from "../api";
import utc from "dayjs/plugin/utc";
import { useState } from "react";
import fetch from "node-fetch";

extend(utc);

interface CreateTaskFromNotificationProps {
  notification: Notification;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

interface TaskCreationFormValues {
  title: string;
  project: string;
  dueAt: Date | null;
  priority: string;
}

interface ProjectSummary {
  name: string;
  source_id: string;
}

interface TaskCreation {
  title: string;
  project: ProjectSummary;
  due_at?: { type: "DateTimeWithTz"; content: string };
  priority: TaskPriority;
}

export function CreateTaskFromNotification({ notification, mutate }: CreateTaskFromNotificationProps) {
  const preferences = getPreferenceValues<UniversalInboxPreferences>();
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");

  const { isLoading, data: projects } = useFetch<Array<ProjectSummary>>(
    `${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/tasks/projects/search?matches=${searchText}`,
    {
      keepPreviousData: true,
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    },
  );

  const { handleSubmit, itemProps } = useForm<TaskCreationFormValues>({
    initialValues: {
      title: notification.title,
      project: projects?.find((p) => p.name === "Inbox")?.source_id,
      dueAt: new Date(),
      priority: `${TaskPriority.P4 as number}`,
    },
    async onSubmit(values) {
      const project = projects?.find((p) => p.source_id === values.project);
      if (!project) {
        throw new Error("Project not found");
      }
      const taskCreation: TaskCreation = {
        title: values.title,
        project: project,
        due_at: values.dueAt ? { type: "DateTimeWithTz", content: dayjs(values.dueAt).utc().format() } : undefined,
        priority: parseInt(values.priority) as TaskPriority,
      };
      await createTaskFromNotification(taskCreation, notification, mutate);
      pop();
    },
    validation: {
      title: FormValidation.Required,
      project: FormValidation.Required,
      priority: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Create task from notification"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Calendar} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Task title" placeholder="Enter task title" {...itemProps.title} />
      <Form.Dropdown
        title="Project"
        placeholder="Search project..."
        filtering={true}
        throttle={true}
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        {...itemProps.project}
      >
        <Form.Dropdown.Item value="" title="" key={0} />
        {projects?.map((project) => {
          return <Form.Dropdown.Item title={project.name} value={project.source_id} key={project.source_id} />;
        })}
      </Form.Dropdown>
      <Form.DatePicker title="Due at" min={new Date()} type={Form.DatePicker.Type.Date} {...itemProps.dueAt} />
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        <Form.Dropdown.Item title="Priority 1" value={`${TaskPriority.P1 as number}`} key={TaskPriority.P1} />
        <Form.Dropdown.Item title="Priority 2" value={`${TaskPriority.P2 as number}`} key={TaskPriority.P2} />
        <Form.Dropdown.Item title="Priority 3" value={`${TaskPriority.P3 as number}`} key={TaskPriority.P3} />
        <Form.Dropdown.Item title="Priority 4" value={`${TaskPriority.P4 as number}`} key={TaskPriority.P4} />
      </Form.Dropdown>
    </Form>
  );
}

async function createTaskFromNotification(
  taskCreation: TaskCreation,
  notification: Notification,
  mutate: MutatePromise<Page<Notification> | undefined>,
) {
  const preferences = getPreferenceValues<UniversalInboxPreferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task from notification" });
  try {
    await mutate(
      handleErrors(
        fetch(`${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/notifications/${notification.id}/task`, {
          method: "POST",
          body: JSON.stringify(taskCreation),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        }),
      ),
      {
        optimisticUpdate(page) {
          if (page) {
            page.content = page.content.filter((n) => n.id !== notification.id);
          }
          return page;
        },
      },
    );

    toast.style = Toast.Style.Success;
    toast.title = "Task successfully created";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create task from notification";
    toast.message = (error as Error).message;
    throw error;
  }
}
