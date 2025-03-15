import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useCallback } from "react";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import { TodoStatus, Priority, Preferences } from "./types";

interface FormValues {
  content: string;
  page: string;
  status: TodoStatus;
  priority: Priority;
  tags: string;
  dueDate: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [pageCache, setPageCache] = useState<Record<string, string>>({});
  const [lastSubmittedContent, setLastSubmittedContent] = useState<string>("");

  const loadPageContent = useCallback(
    async (pagePath: string) => {
      if (pageCache[pagePath]) {
        return pageCache[pagePath];
      }
      try {
        const content = await readFile(pagePath, "utf-8");
        setPageCache((prev) => ({ ...prev, [pagePath]: content }));
        return content;
      } catch (error) {
        return `# ${pagePath.split("/").pop()?.replace(".md", "")}\n\n`;
      }
    },
    [pageCache],
  );

  const [formValues, setFormValues] = useState<FormValues>({
    content: "",
    page: "",
    status: "WAITING",
    priority: "B",
    tags: "",
    dueDate: "",
  });

  async function handleSubmit(values: FormValues) {
    try {
      if (values.content === lastSubmittedContent) {
        await showToast({
          style: Toast.Style.Warning,
          title: "Duplicate Content",
          message: "You just submitted the same content. Are you sure you want to submit it again?",
        });
      }
      setLastSubmittedContent(values.content);
      const page = values.page || preferences.defaultPage;
      const pagePath = join(preferences.logseqPath, "pages", `${page}.md`);

      const content = await loadPageContent(pagePath);

      const status = values.status;
      const priority = values.priority;
      const tags = values.tags
        ? values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag)
            .map((tag) => `#${tag}`)
            .join(" ")
        : "";
      let dueDate = "";
      if (values.dueDate) {
        const date = new Date(values.dueDate);
        const weekday = date.toLocaleString("en-US", { weekday: "short" });
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        dueDate = ` 📅 ${weekday} ${date.toLocaleString("en-US", { month: "short" })} ${date.getDate()} ${date.getFullYear()}\nDEADLINE: <${formattedDate} ${weekday}>`;
      }
      const todoItem = `- ${status} [#${priority}] ${values.content} ${tags}${dueDate}\n`;
      const newContent = content.endsWith("\n\n")
        ? content + todoItem
        : content.endsWith("\n")
          ? content + "\n" + todoItem
          : content + "\n\n" + todoItem;
      await writeFile(pagePath, newContent, "utf-8");
      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Todo item added successfully",
      });
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to add Todo");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Todo" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      enableDrafts
      value={formValues}
      onChange={setFormValues}
    >
      <Form.TextField id="content" title="Todo Content" placeholder="Enter Todo content" autoFocus />
      <Form.TextField id="page" title="Page Name" placeholder={preferences.defaultPage} />
      <Form.Dropdown id="status" title="Status" defaultValue="WAITING">
        <Form.Dropdown.Item value="TODO" title="TODO" />
        <Form.Dropdown.Item value="NOW" title="NOW" />
        <Form.Dropdown.Item value="WAITING" title="WAITING" />
        <Form.Dropdown.Item value="LATER" title="LATER" />
        <Form.Dropdown.Item value="DOING" title="DOING" />
        <Form.Dropdown.Item value="DONE" title="DONE" />
        <Form.Dropdown.Item value="CANCELED" title="CANCELED" />
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="B">
        <Form.Dropdown.Item value="A" title="A - High Priority" />
        <Form.Dropdown.Item value="B" title="B - Medium Priority" />
        <Form.Dropdown.Item value="C" title="C - Low Priority" />
      </Form.Dropdown>
      <Form.TextField id="tags" title="Tags" placeholder="Enter tags, separated by commas" />
      <Form.DatePicker id="dueDate" title="Due Date" type="date" />
    </Form>
  );
}
