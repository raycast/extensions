import { Action, ActionPanel, Form, showToast, Toast, popToRoot, Clipboard } from "@raycast/api";
import { useState } from "react";
import { getHeptabaseMCPClient } from "./heptabase-mcp-client";
import { authorize } from "./heptabase-oauth";

/**
 * Save to Note Card
 * Create a new note card in Heptabase's main space
 */
export default function SaveToNoteCard() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { content: string }) {
    if (!values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Content cannot be empty",
        message: "Please enter content for the card",
      });
      return;
    }

    // Ensure content starts with H1 for title
    let finalContent = values.content.trim();
    if (!finalContent.startsWith("# ")) {
      const lines = finalContent.split("\n");
      const firstLine = lines[0];
      lines[0] = `# ${firstLine}`;
      finalContent = lines.join("\n");
    }

    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating card...",
      });

      // Ensure authorized
      await authorize();

      // Get MCP client
      const client = getHeptabaseMCPClient();

      // Call save_to_note_card tool
      await client.callTool("save_to_note_card", {
        content: finalContent,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Card created",
        message: "Note card saved to Heptabase",
      });

      // Close after success
      await popToRoot();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error creating card:", e);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create card",
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
          <Action.SubmitForm title="Save Card" onSubmit={handleSubmit} />
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
        title="Card Content"
        placeholder="# Card Title&#10;&#10;Enter card content here (Markdown supported)&#10;&#10;The first line will be used as the title."
        value={content}
        onChange={setContent}
        enableMarkdown
      />
      <Form.Description text="First line becomes the card title (H1 added automatically if needed). Separate blocks with empty lines." />
    </Form>
  );
}
