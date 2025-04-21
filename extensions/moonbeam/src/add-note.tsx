import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useForm } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";

interface Preferences {
  apiToken: string;
  notebookId: string;
}

interface FormValues {
  title: string;
  content: string;
}

const formatMarkdownContent = (content: string): string => {
  // Handle line breaks in markdown
  return content.replace(/\n/g, "  \n");
};

const generateSourceId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (!preferences.apiToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "API Token Required",
        message:
          "Please set your Lunatask API token in the extension preferences",
      });
    }
  }, [preferences.apiToken]);

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

      if (!preferences.notebookId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Notebook ID Required",
          message:
            "Please set your Lunatask Notebook ID in the extension preferences",
        });
        return;
      }

      if (!values.title) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Title Required",
          message: "Please enter a title for your note",
        });
        return;
      }

      try {
        const response = await fetch("https://api.lunatask.app/v1/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${preferences.apiToken}`,
          },
          body: JSON.stringify({
            name: values.title,
            content: formatMarkdownContent(values.content || ""),
            notebook_id: preferences.notebookId,
            note_on: new Date().toISOString().split("T")[0],
            source: "raycast",
            source_id: generateSourceId(),
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Invalid API token. Please check your token in the extension preferences."
            );
          }
          throw new Error(
            `Failed to create note: ${JSON.stringify(responseData)}`
          );
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Note created successfully",
        });
      } catch (error) {
        showFailureToast(error, { title: "Failed to create note" });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title"
        placeholder="Enter note title"
        {...itemProps.title}
      />
      <Form.TextArea
        title="Content"
        placeholder="Enter note content (supports markdown)"
        enableMarkdown
        {...itemProps.content}
      />
    </Form>
  );
}
