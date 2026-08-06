import { Tool } from "@raycast/api";
import { createTaskNote } from "../tasknotes";

type Input = {
  /**
   * Vault name to create the task in. Required when TaskNotes is configured for multiple vaults.
   */
  vaultName?: string;
  /**
   * Concise task title without tags, contexts, priority labels, or date phrases.
   */
  title: string;
  /**
   * Optional Markdown notes or extra task details.
   */
  details?: string;
  /**
   * Task status. Use "open" unless the user explicitly asks for another status.
   */
  status?: string;
  /**
   * Priority as one of highest, high, medium, low, or lowest.
   */
  priority?: string;
  /**
   * Due date in ISO 8601 date or date-time format.
   */
  dueDate?: string;
  /**
   * Scheduled/start date in ISO 8601 date or date-time format.
   */
  scheduledDate?: string;
  /**
   * Contexts from @mentions, without the @ prefix.
   */
  contexts?: string[];
  /**
   * TaskNotes projects.
   */
  projects?: string[];
  /**
   * Tags from hashtags, without the # prefix.
   */
  tags?: string[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Create "${input.title}" in TaskNotes?`,
    info: [
      { name: "Due", value: input.dueDate },
      { name: "Scheduled", value: input.scheduledDate },
      { name: "Vault", value: input.vaultName },
      { name: "Priority", value: input.priority },
      { name: "Contexts", value: input.contexts?.join(", ") },
      { name: "Projects", value: input.projects?.join(", ") },
      { name: "Tags", value: input.tags?.join(", ") },
    ],
  };
};

/**
 * Create a TaskNotes Markdown task in the configured Obsidian vault.
 */
export default async function tool(input: Input) {
  const task = await createTaskNote({
    vaultName: input.vaultName,
    title: input.title,
    details: input.details,
    status: input.status,
    priority: input.priority,
    due: parseDate(input.dueDate),
    scheduled: parseDate(input.scheduledDate),
    contexts: input.contexts?.join(", "),
    projects: input.projects?.join(", "),
    tags: input.tags?.join(", "),
  });

  return {
    title: task.title,
    status: task.status,
    due: task.due,
    scheduled: task.scheduled,
    priority: task.priority,
    contexts: task.contexts,
    projects: task.projects,
    tags: task.tags,
    path: task.path,
    message: `Created "${task.title}" in TaskNotes.`,
  };
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;

  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return undefined;
  }

  return datePart;
}
