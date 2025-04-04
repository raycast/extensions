import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import { Preferences } from "./types";

interface FormValues {
  content: string;
  page: string;
  tags: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(values: FormValues) {
    try {
      const page = values.page || preferences.defaultPage;
      const pagePath = join(preferences.logseqPath, "pages", `${page}.md`);

      let content = "";
      try {
        content = await readFile(pagePath, "utf-8");
      } catch (error) {
        content = `# ${page}\n\n`;
      }

      const tags = values.tags
        ? values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag)
            .map((tag) => `#${tag}`)
            .join(" ")
        : "";
      const createdAt = new Date().toISOString().split("T")[0];
      const noteItem = `- ${values.content} ${tags} 📅 ${createdAt}\n`;
      const newContent = content.endsWith("\n\n")
        ? content + noteItem
        : content.endsWith("\n")
          ? content + "\n" + noteItem
          : content + "\n\n" + noteItem;

      await writeFile(pagePath, newContent, "utf-8");
      await showToast(Toast.Style.Success, "Note added successfully");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to add Note");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Note Content" placeholder="Enter Note content" autoFocus />
      <Form.TextField id="page" title="Page Name" placeholder={preferences.defaultPage} />
      <Form.TextField id="tags" title="Tags" placeholder="Enter tags, separated by commas" />
    </Form>
  );
}
