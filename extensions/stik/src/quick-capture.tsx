import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { promises as fs, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { getNotesDirectory, generateFilename, listFolders } from "./utils";

export default function QuickCapture() {
  const { data: folders = [] } = usePromise(listFolders);

  async function handleSubmit(values: {
    title: string;
    body: string;
    folder: string;
  }) {
    const title = values.title.trim();
    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    const dir = getNotesDirectory();
    const targetDir = values.folder ? join(dir, values.folder) : dir;
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const filename = generateFilename(title);
    const filePath = join(targetDir, filename);

    // Main app format: plain markdown, no frontmatter. Title = first line.
    const body = values.body.trim();
    const content = body ? `${title}\n\n${body}` : title;

    try {
      await fs.writeFile(filePath, content, "utf-8");
      const folderLabel = values.folder ? ` in ${values.folder}` : "";
      await showToast({
        style: Toast.Style.Success,
        title: "Note saved",
        message: `${title}${folderLabel}`,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: String(err),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Note title..." />
      <Form.TextArea
        id="body"
        title="Body"
        placeholder="Write your note..."
        enableMarkdown
      />
      <Form.Dropdown id="folder" title="Folder" defaultValue="">
        <Form.Dropdown.Item value="" title="Root (No Folder)" />
        {folders.map((f) => (
          <Form.Dropdown.Item key={f} value={f} title={f} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
