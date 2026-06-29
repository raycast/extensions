import { getProjects, createTask } from "../api/ticktick";
import { batchSync } from "../api/sync";

type Input = {
  title: string;
  projectName?: string;
  dueDate?: string;
  content?: string;
};

export default async function (input: Input) {
  const { title, projectName, dueDate, content } = input;

  const { inboxId } = await batchSync();
  const projects = await getProjects();
  const project = projects.find((p) => p.name === projectName);
  const projectId = project?.id || inboxId || "";
  const resolvedProjectName = project?.name || "Inbox";

  await createTask({
    title,
    projectId,
    content,
    dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
  });

  return `Task "${title}" has been added to ${resolvedProjectName}.${content ? `\nContent: ${content}` : ""}${
    dueDate ? `\nDue Date: ${new Date(dueDate).toLocaleDateString()}` : ""
  }`;
}
