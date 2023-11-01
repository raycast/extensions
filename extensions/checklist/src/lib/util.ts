import { Checklist, ShareableChecklist } from "../types";
import { Clipboard } from "@raycast/api";

export function generateClipboardExport(checklist: Checklist, options: { type: "markdown" | "jira" }) {
  const { title, tasks } = checklist;

  const tasksString = tasks.map((task) => {
    if (options.type === "markdown") {
      return `- ✅ ${task.name}`;
    }

    if (options.type === "jira") {
      return `* ✅ ${task.name}`;
    }

    // return `- ✅ ${task.name}`;
  });

  return `
    ${title}
    ${tasksString.join("\n")}
    `;
}

export async function checkClipboardContent() {
  const clipboardContent = await Clipboard.readText();
  if (clipboardContent) {
    try {
      const parsedContent = JSON.parse(clipboardContent);
      if (ShareableChecklist.safeParse(parsedContent)) {
        return parsedContent as ShareableChecklist;
      }
    } catch {
      return null;
    }
  } else return null;
}

export function shareableChecklist({ title, tasks }: Checklist) {
  return {
    title,
    tasks: tasks.map(({ name }) => ({ name })),
  } as ShareableChecklist;
}
