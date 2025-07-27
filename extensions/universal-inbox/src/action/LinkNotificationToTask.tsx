import { Action, ActionPanel, useNavigation, Form, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { MutatePromise, useForm, FormValidation, useFetch } from "@raycast/utils";
import { Page, UniversalInboxPreferences } from "../types";
import { Notification } from "../notification";
import { Task, TaskStatus } from "../task";
import { handleErrors } from "../api";
import { useState } from "react";
import fetch from "node-fetch";

interface LinkNotificationToTaskProps {
  notification: Notification;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

interface TaskLinkFormValues {
  taskId: string;
}

export function LinkNotificationToTask({ notification, mutate }: LinkNotificationToTaskProps) {
  const preferences = getPreferenceValues<UniversalInboxPreferences>();
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");

  const { isLoading, data: tasks } = useFetch<Array<Task>>(
    `${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/tasks/search?matches=${searchText}`,
    {
      keepPreviousData: true,
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    },
  );

  const { handleSubmit, itemProps } = useForm<TaskLinkFormValues>({
    async onSubmit(values) {
      await linkNotificationToTask(notification, values.taskId, mutate);
      pop();
    },
    validation: {
      taskId: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Link notification with task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Link to Task" icon={Icon.Link} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        title="Task"
        placeholder="Search task..."
        filtering={true}
        throttle={true}
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        {...itemProps.taskId}
      >
        <Form.Dropdown.Item value="" title="" key={0} />
        {tasks?.map((task) => {
          return <Form.Dropdown.Item title={task.title} value={task.id} key={task.id} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}

async function linkNotificationToTask(
  notification: Notification,
  taskId: string,
  mutate: MutatePromise<Page<Notification> | undefined>,
) {
  const preferences = getPreferenceValues<UniversalInboxPreferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Linking notification to task" });
  try {
    await mutate(
      handleErrors(
        fetch(`${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/notifications/${notification.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: TaskStatus.Deleted, task_id: taskId }),
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
    toast.title = "Notification successfully linked to task";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to link notification to task";
    toast.message = (error as Error).message;
    throw error;
  }
}
