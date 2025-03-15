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
      await showToast(Toast.Style.Success, "Note已添加");
    } catch (error) {
      console.error(error);
      await showToast(Toast.Style.Failure, "添加Note失败");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="添加note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Note内容" placeholder="输入Note内容" autoFocus />
      <Form.TextField id="page" title="页面名称" placeholder={preferences.defaultPage} />
      <Form.TextField id="tags" title="标签" placeholder="输入标签，用逗号分隔" />
    </Form>
  );
}
