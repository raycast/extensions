import { Action, useNavigation, ActionPanel, Form, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { MutatePromise, useForm, FormValidation, useFetch } from "@raycast/utils";
import { Notification, isNotificationBuiltFromTask } from "../notification";
import { Page, UniversalInboxPreferences } from "../types";
import { default as dayjs, extend } from "dayjs";
import { TaskPriority } from "../task";
import { handleErrors } from "../api";
import utc from "dayjs/plugin/utc";
import { useState } from "react";
import fetch from "node-fetch";

extend(utc);

interface PlanTaskProps {
  notification: Notification;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

interface TaskPlanningFormValues {
  project: string;
  dueAt: Date | null;
  priority: string;
}

interface ProjectSummary {
  name: string;
  source_id: string;
}

interface TaskPlanning {
  project: ProjectSummary;
  due_at?: { type: "DateTimeWithTz"; content: string };
  priority: TaskPriority;
}

export function PlanTask({ notification, mutate }: PlanTaskProps) {
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

  const { handleSubmit, itemProps } = useForm<TaskPlanningFormValues>({
    initialValues: {
      dueAt: new Date(),
      project: projects?.find((p) => p.name === "Inbox")?.source_id,
      priority: `${TaskPriority.P4 as number}`,
    },
    async onSubmit(values) {
      const project = projects?.find((p) => p.source_id === values.project);
      if (!project) {
        throw new Error("Project not found");
      }
      const taskPlanning: TaskPlanning = {
        project: project,
        due_at: values.dueAt ? { type: "DateTimeWithTz", content: dayjs(values.dueAt).utc().format() } : undefined,
        priority: parseInt(values.priority) as TaskPriority,
      };
      await planTask(taskPlanning, notification, mutate);
      pop();
    },
    validation: {
      project: FormValidation.Required,
      priority: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Plan task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Plan Task" icon={Icon.Calendar} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Task title" text={notification.title} />
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

async function planTask(
  taskPlanning: TaskPlanning,
  notification: Notification,
  mutate: MutatePromise<Page<Notification> | undefined>,
) {
  if (!isNotificationBuiltFromTask(notification) || !notification.task) {
    return;
  }

  const preferences = getPreferenceValues<UniversalInboxPreferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Planning task" });
  try {
    await mutate(
      handleErrors(
        fetch(`${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/tasks/${notification.task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            project: taskPlanning.project.name,
            due_at: taskPlanning.due_at,
            priority: taskPlanning.priority,
          }),
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
    toast.title = "Task successfully planned";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to plan task";
    toast.message = (error as Error).message;
    throw error;
  }
}
