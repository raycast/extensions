import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useForm } from "@raycast/utils";

interface Preferences {
  apiToken: string;
  areaId: string;
}

interface FormValues {
  name: string;
  description?: string;
}

const generateSourceId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      if (!preferences.apiToken) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Token Required",
          message:
            "Please set your Lunatask API token in the extension preferences",
        });
        return;
      }

      if (!preferences.areaId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Area ID Required",
          message:
            "Please set your Lunatask Area ID in the extension preferences",
        });
        return;
      }

      if (!values.name) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Task Name Required",
          message: "Please enter a name for the task",
        });
        return;
      }

      try {
        const requestBody = {
          name: values.name,
          description: values.description || null,
          area_id: preferences.areaId,
          source: "raycast",
          source_id: generateSourceId(),
        };

        const response = await fetch("https://api.lunatask.app/v1/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${preferences.apiToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        const responseData = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Invalid API token. Please check your token in the extension preferences.",
            );
          }
          throw new Error(
            `Failed to create task: ${JSON.stringify(responseData)}`,
          );
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Task created successfully",
        });
      } catch (error) {
        showFailureToast(error, { title: "Failed to create task" });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Task Name"
        placeholder="Enter task name"
        {...itemProps.name}
      />
      <Form.TextArea
        title="Description"
        placeholder="Enter task description (optional)"
        {...itemProps.description}
      />
    </Form>
  );
}
