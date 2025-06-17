import {
  Form,
  ActionPanel,
  Action,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { saveToInbox } from "./utils/fileSystem";
import { handleSaveError } from "./utils/errorHandling";

interface Preferences {
  inboxPath: string;
}

export default function CaptureCommand() {
  const [content, setContent] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit() {
    // If content is empty, just close
    if (!content.trim()) {
      await closeMainWindow();
      return;
    }

    try {
      await saveToInbox(content, preferences.inboxPath);
      await closeMainWindow();
    } catch (error) {
      await handleSaveError(error as Error, content);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save to Inbox"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title=""
        placeholder="What's on your mind?"
        value={content}
        onChange={setContent}
        autoFocus
        enableMarkdown={false}
      />
    </Form>
  );
}
