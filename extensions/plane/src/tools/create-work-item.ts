import { Tool } from "@raycast/api";
import {
  parseToolDate,
  resolveMemberIds,
  resolvePriority,
  resolveProject,
  resolveState,
  serializeWorkItem,
} from "../api/ai";
import { planeRequest, workspacePath } from "../api/request";
import type { RawWorkItem } from "../api/types";
import { parseMarkdownToHtml } from "../helpers/parser";
import { withPlane } from "../helpers/with-plane";

type Input = {
  /** Title of the work item. */
  title: string;
  /** Project identifier (e.g. ENG), name, or id. */
  project: string;
  /** Description in Markdown. */
  description?: string;
  /** State name (e.g. "In Progress"), state group (backlog, unstarted, started, completed, cancelled), or id. Defaults to the project's default state. */
  state?: string;
  /** One of urgent, high, medium, low, none. */
  priority?: string;
  /** Assignees: "me", member ids, emails, or names. */
  assignees?: string[];
  /** Start date as YYYY-MM-DD. */
  startDate?: string;
  /** Due date as YYYY-MM-DD. */
  dueDate?: string;
};

export default withPlane(async (input: Input) => {
  const project = await resolveProject(input.project);
  const state = input.state ? await resolveState(project.id, input.state) : undefined;
  const assignees = await resolveMemberIds(project.id, input.assignees ?? []);
  const body = {
    name: input.title.trim(),
    ...(input.description ? { description_html: await parseMarkdownToHtml(input.description) } : {}),
    ...(state ? { state: state.id } : {}),
    ...(input.priority ? { priority: resolvePriority(input.priority) } : {}),
    ...(assignees.length > 0 ? { assignees } : {}),
    ...(input.startDate ? { start_date: parseToolDate(input.startDate) } : {}),
    ...(input.dueDate ? { target_date: parseToolDate(input.dueDate) } : {}),
  };
  const created = await planeRequest<RawWorkItem>(workspacePath("projects", project.id, "work-items"), {
    method: "POST",
    body,
  });
  return serializeWorkItem(created, project);
});

export const confirmation: Tool.Confirmation<Input> = withPlane(async (input: Input) => {
  const project = await resolveProject(input.project);
  const info = [
    { name: "Project", value: `${project.name} (${project.identifier})` },
    { name: "Title", value: input.title },
  ];
  if (input.state) info.push({ name: "State", value: (await resolveState(project.id, input.state)).name });
  if (input.priority) info.push({ name: "Priority", value: resolvePriority(input.priority) });
  if (input.assignees?.length) info.push({ name: "Assignees", value: input.assignees.join(", ") });
  if (input.startDate) info.push({ name: "Start Date", value: input.startDate });
  if (input.dueDate) info.push({ name: "Due Date", value: input.dueDate });
  if (input.description) info.push({ name: "Description", value: input.description.slice(0, 300) });
  return { message: `Create a work item in ${project.identifier}?`, info };
});
