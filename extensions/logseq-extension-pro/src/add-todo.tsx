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

  async function handleSubmit(values: FormValues) {
    try {
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

      `"${newContent}"`;

      await writeFile(pagePath, newContent, "utf-8");
      await showToast(Toast.Style.Success, "Todo已添加");
    } catch (error) {
      await showToast(Toast.Style.Failure, "添加Todo失败");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="添加todo" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="content" title="Todo内容" placeholder="输入Todo内容" autoFocus />
      <Form.TextField id="page" title="页面名称" placeholder={preferences.defaultPage} />
      <Form.Dropdown id="status" title="状态" defaultValue="WAITING">
        <Form.Dropdown.Item value="TODO" title="TODO" />
        <Form.Dropdown.Item value="NOW" title="NOW" />
        <Form.Dropdown.Item value="WAITING" title="WAITING" />
        <Form.Dropdown.Item value="LATER" title="LATER" />
        <Form.Dropdown.Item value="DOING" title="DOING" />
        <Form.Dropdown.Item value="DONE" title="DONE" />
        <Form.Dropdown.Item value="CANCELED" title="CANCELED" />
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="优先级" defaultValue="B">
        <Form.Dropdown.Item value="A" title="A级 - 紧急" />
        <Form.Dropdown.Item value="B" title="B级 - 普通" />
        <Form.Dropdown.Item value="C" title="C级 - 低优先级" />
      </Form.Dropdown>
      <Form.TextField id="tags" title="标签" placeholder="输入标签，用逗号分隔" />
      <Form.DatePicker id="dueDate" title="截止日期" type="date" />
    </Form>
  );
}
