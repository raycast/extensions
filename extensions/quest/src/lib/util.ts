import { Quest, ShareableQuest } from "../types";
import { Clipboard } from "@raycast/api";

export function generateClipboardExport(quest: Quest, options: { type: "markdown" | "jira" }) {
  const { title, tasks } = quest;

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
      if (ShareableQuest.safeParse(parsedContent)) {
        return parsedContent as ShareableQuest;
      }
    } catch {
      return null;
    }
  } else return null;
}

export function sharableQuest({ title, tasks }: Quest) {
  return {
    title,
    tasks: tasks.map(({ name }) => ({ name })),
  } as ShareableQuest;
}
