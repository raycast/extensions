import { Quest } from "../types";

export default function generateClipboardExport(quest: Quest, options: { type: "markdown" | "jira" }) {
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
