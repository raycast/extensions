import { Action, ActionPanel, Form, showToast, Toast, popToRoot, LaunchProps, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { getHeptabaseMCPClient } from "./heptabase-mcp-client";
import { authorize } from "./heptabase-oauth";

/**
 * Append to Heptabase Journal
 * Add content to today's Heptabase journal
 */
export default function AppendToJournal(props: LaunchProps<{ arguments: Arguments.AppendToJournal }>) {
  const [content, setContent] = useState(props.arguments.content || "");
  const [isLoading, setIsLoading] = useState(false);

  // If content is provided via arguments, submit immediately
  useEffect(() => {
    if (props.arguments.content && props.arguments.content.trim()) {
      handleSubmit({ content: props.arguments.content });
    }
  }, []);

  async function handleSubmit(values: { content: string }) {
    if (!values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Content cannot be empty",
        message: "Please enter content to add to journal",
      });
      return;
    }

    try {
      setIsLoading(true);

      await showToast({
        style: Toast.Style.Animated,
        title: "Adding to journal...",
      });

      // Ensure authorized
      await authorize();

      // Get MCP client
      const client = getHeptabaseMCPClient();

      // Call append_to_journal tool
      await client.callTool("append_to_journal", {
        content: values.content,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Successfully added to journal",
        message: "Content added to today's Heptabase journal",
      });

      // Close after success
      await popToRoot();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error appending to journal:", e);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function pasteFromClipboard() {
    const text = await Clipboard.readText();
    if (text) {
      setContent((prev) => (prev ? `${prev}\n\n${text}` : text));
      await showToast({
        style: Toast.Style.Success,
        title: "Pasted from clipboard",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Journal" onSubmit={handleSubmit} />
          <Action
            title="Paste from Clipboard"
            onAction={pasteFromClipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Journal Content"
        placeholder="Enter content to add to today's journal (Markdown supported)&#10;&#10;Separate blocks with empty lines"
        value={content}
        onChange={setContent}
        enableMarkdown
      />
      <Form.Description text="Content will be added to today's Heptabase journal. If today's journal doesn't exist, it will be created automatically." />
    </Form>
  );
}
