import { showToast, Toast, Form, ActionPanel, Action, closeMainWindow } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";

export default function Command() {
  const purgatoryPath = path.join(os.homedir(), "purgatory.md");

  const handleSubmit = async (values: { input: string }) => {
    const timestamp = new Date().toLocaleString();
    const entry = `### ${timestamp}\n- ${values.input}\n\n`;

    try {
      fs.appendFileSync(purgatoryPath, entry);
      await showToast({ style: Toast.Style.Success, title: "Dropped into Purgatory." });
      await closeMainWindow();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: `${error}` });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Distraction" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="What's the distraction?"
        placeholder="e.g. look into some obscure Go runtime thing..."
      />
    </Form>
  );
}
