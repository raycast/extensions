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
  priority?: string;
  estimate?: string;
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

  // Try to find and remove date-related phrases from the text
  // This regex looks for common date patterns and prepositions
  const datePatterns = [
    // Specific "due" patterns that need special handling (check these first)
    /\b(due)\s+(next|this|last)?\s*(week|month|year)\b/gi,
    // Preposition + date patterns
    /\b(on|by|due|before|after|at)\s+([^,]+?)(?:\s|$)/gi,
    // Relative time patterns
    /\b(next|this|last)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
    // Time of day patterns
    /\b(tomorrow|today|yesterday|morning|afternoon|evening|night)\b/gi,
    // Day patterns
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    // Date patterns
    /\b(\d{1,2}(?:st|nd|rd|th)?(?:\s+of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)?)\b/gi,
    // Relative day patterns
    /\b(in\s+\d+\s+days?|in\s+\d+\s+weeks?|in\s+\d+\s+months?)\b/gi,
    // Standalone time words
    /\b(week|month|year)\b/gi,
  ];

  let cleanText = text;
  let foundDatePhrase = false;

  // Try each pattern to find and remove date phrases
  for (const pattern of datePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      // Remove the matched date phrase
      cleanText = cleanText.replace(pattern, "").trim();
      foundDatePhrase = true;
      break; // Only remove the first match to avoid over-cleaning
    }
  }

  // If no specific date phrase was found but we have a parsed date,
  // try to remove common date words that might be left
  if (!foundDatePhrase) {
    const commonDateWords =
      /\b(tomorrow|today|yesterday|next|this|last|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|night|week|month|year)\b/gi;
    const hasDateWords = commonDateWords.test(cleanText);
    if (hasDateWords) {
      cleanText = cleanText.replace(commonDateWords, "").trim();
    }
  }

  // Clean up extra spaces
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  return {
    cleanText: cleanText || text, // Fallback to original text if cleaning results in empty string
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
          note: values.description || null,
          area_id: preferences.areaId,
          source: "raycast",
          source_id: generateSourceId(),
          ...(dueDate && { scheduled_on: dueDate }),
          ...(values.priority && { priority: parseInt(values.priority) }),
          ...(values.estimate && { estimate: parseInt(values.estimate) }),
        };

        console.log("Sending request to Lunatask API:", JSON.stringify(requestBody, null, 2));

        const response = await fetch("https://api.lunatask.app/v1/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${preferences.apiToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        const responseData = await response.json();
        console.log("API Response:", JSON.stringify(responseData, null, 2));

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Invalid API token. Please check your token in the extension preferences."
            );
          }
          if (response.status === 422) {
            throw new Error(`Validation error: ${JSON.stringify(responseData)}`);
          }
          throw new Error(
            `Failed to create task (${response.status}): ${JSON.stringify(responseData)}`
          );
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Task created successfully",
          message: `Created task: ${responseData.task?.name || cleanText}`,
        });
      } catch (error) {
        console.error("Task creation error:", error);
        showFailureToast(error instanceof Error ? error.message : "Failed to create task");
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
      <Form.TextField
        title="Priority"
        placeholder="Enter priority (0-4, optional)"
        {...itemProps.priority}
      />
      <Form.TextField
        title="Estimate (minutes)"
        placeholder="Enter estimated time in minutes (optional)"
        {...itemProps.estimate}
      />
    </Form>
  );
}
