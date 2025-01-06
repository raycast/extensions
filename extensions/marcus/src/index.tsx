import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useCallback } from "react";
import { appendFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

// Create constant for the app directory and journal path
const MARCUS_DIR = join(homedir(), ".marcus");
const JOURNAL_PATH = join(MARCUS_DIR, "journal.txt");

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [textValue, setTextValue] = useState("");

  const handleSubmit = useCallback(async (values: { entry: string }) => {
    if (!values.entry.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Empty Entry",
        message: "Please write something before saving",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Ensure directory exists
      if (!existsSync(MARCUS_DIR)) {
        await mkdir(MARCUS_DIR, { recursive: true });
      }

      const timestamp = new Date().toLocaleString();
      const entry = `\n[${timestamp}]\n${values.entry}\n${"─".repeat(50)}\n`;

      await appendFile(JOURNAL_PATH, entry);

      await showToast({
        style: Toast.Style.Success,
        title: "Journal Entry Saved",
        message: "Your thoughts have been recorded",
      });

      setTextValue("");
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save",
        message: String(error),
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextArea
        id="entry"
        title="Journal Entry"
        placeholder="What's on your mind?"
        enableMarkdown
        autoFocus
        value={textValue}
        onChange={setTextValue}
      />
    </Form>
  );
}
