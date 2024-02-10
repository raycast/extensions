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
  });

  return `
    ${title}
    ${tasksString.join("\n")}
    `;
}

export async function checkClipboardContent(): Promise<{ checklist: ShareableChecklist | null }> {
  const clipboardContent = await Clipboard.readText();
  if (!clipboardContent) return { checklist: null };

  try {
    const parsedChecklist = ShareableChecklist.parse(JSON.parse(clipboardContent));

    if (parsedChecklist.tasks.length > 0) {
      return { checklist: parsedChecklist };
    } else {
      return { checklist: null };
    }
  } catch {
    return { checklist: null };
  }
}

export function shareableChecklist({ title, tasks }: Checklist) {
  return {
    title,
    tasks: tasks.map(({ name }) => ({ name })),
  } as ShareableChecklist;
}
