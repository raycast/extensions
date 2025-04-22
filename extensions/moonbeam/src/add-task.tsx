import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useForm } from "@raycast/utils";
import * as chrono from "chrono-node";

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

const parseDateFromText = (text: string): { cleanText: string; dueDate?: string } => {
  const parsedDate = chrono.parseDate(text);
  if (!parsedDate) {
    return { cleanText: text };
  }

  // Extract the date part from the text
  const dateMatch = text.match(/\b(on|by|due|before|after)\s+([^,]+)/i);
  if (dateMatch) {
    const dateText = dateMatch[0];
    const cleanText = text.replace(dateText, "").trim();
    return {
      cleanText,
      dueDate: parsedDate.toISOString().split("T")[0],
    };
  }

  return {
    cleanText: text,
    dueDate: parsedDate.toISOString().split("T")[0],
  };
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async values => {
      if (!preferences.apiToken) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Token Required",
          message: "Please set your Lunatask API token in the extension preferences",
        });
        return;
      }

      if (!preferences.areaId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Area ID Required",
          message: "Please set your Lunatask Area ID in the extension preferences",
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
        const { cleanText, dueDate } = parseDateFromText(values.name);

        const requestBody = {
          name: cleanText,
          description: values.description || null,
          area_id: preferences.areaId,
          source: "raycast",
          source_id: generateSourceId(),
          ...(dueDate && { due_date: dueDate }),
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
              "Invalid API token. Please check your token in the extension preferences."
            );
          }
          throw new Error(`Failed to create task: ${JSON.stringify(responseData)}`);
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Task created successfully",
        });
      } catch {
        showFailureToast("Failed to create task");
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
        placeholder="Enter task name (e.g., 'Call mom tomorrow' or 'Pay bills on 15th')"
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
