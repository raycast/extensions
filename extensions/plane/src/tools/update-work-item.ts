import { Tool } from "@raycast/api";
import {
  fetchWorkItem,
  parseToolDate,
  resolveMemberIds,
  resolvePriority,
  resolveState,
  serializeWorkItem,
} from "../api/ai";
import { planeRequest, workspacePath } from "../api/request";
import type { RawWorkItem } from "../api/types";
import { getAssigneeIds } from "../helpers/work-item-summary";
import { parseMarkdownToHtml } from "../helpers/parser";
import { withPlane } from "../helpers/with-plane";

type Input = {
  /** Work item identifier such as ENG-123, or a Plane work item URL. */
  identifier: string;
  /** New title. */
  title?: string;
  /** New description in Markdown (replaces the current one). */
  description?: string;
  /** State name (e.g. "Done"), state group (backlog, unstarted, started, completed, cancelled), or id. */
  state?: string;
  /** One of urgent, high, medium, low, none. */
  priority?: string;
  /** Replace all assignees: "me", member ids, emails, or names. Pass an empty list to unassign everyone. */
  assignees?: string[];
  /** Add assignees without removing existing ones ("me", ids, emails, or names). */
  addAssignees?: string[];
  /** Remove these assignees ("me", ids, emails, or names). */
  removeAssignees?: string[];
  /** Start date as YYYY-MM-DD, or "null" to clear. */
  startDate?: string;
  /** Due date as YYYY-MM-DD, or "null" to clear. */
  dueDate?: string;
};

async function buildPatch(input: Input) {
  const { raw, project } = await fetchWorkItem(input.identifier);
  const patch: Record<string, unknown> = {};
  const changes: { name: string; value: string }[] = [];

  if (input.title !== undefined) {
    patch.name = input.title;
    changes.push({ name: "Title", value: input.title });
  }
  if (input.description !== undefined) {
    patch.description_html = await parseMarkdownToHtml(input.description);
    changes.push({ name: "Description", value: input.description.slice(0, 300) });
  }
  if (input.state) {
    const state = await resolveState(project.id, input.state);
    patch.state = state.id;
    changes.push({ name: "State", value: state.name });
  }
  if (input.priority) {
    patch.priority = resolvePriority(input.priority);
    changes.push({ name: "Priority", value: String(patch.priority) });
  }
  if (input.assignees || input.addAssignees || input.removeAssignees) {
    let next = input.assignees ? await resolveMemberIds(project.id, input.assignees) : getAssigneeIds(raw);
    const add = await resolveMemberIds(project.id, input.addAssignees ?? []);
    const remove = await resolveMemberIds(project.id, input.removeAssignees ?? []);
    next = [...new Set([...next, ...add])].filter((id) => !remove.includes(id));
    // Plane replaces the whole assignee set on PATCH.
    patch.assignees = next;
    const described = [
      input.assignees ? `set to ${input.assignees.join(", ") || "nobody"}` : undefined,
      input.addAssignees?.length ? `add ${input.addAssignees.join(", ")}` : undefined,
      input.removeAssignees?.length ? `remove ${input.removeAssignees.join(", ")}` : undefined,
    ].filter(Boolean);
    changes.push({ name: "Assignees", value: described.join("; ") });
  }
  const startDate = parseToolDate(input.startDate);
  if (startDate !== undefined) {
    patch.start_date = startDate;
    changes.push({ name: "Start Date", value: startDate ?? "cleared" });
  }
  const dueDate = parseToolDate(input.dueDate);
  if (dueDate !== undefined) {
    patch.target_date = dueDate;
    changes.push({ name: "Due Date", value: dueDate ?? "cleared" });
  }
  return { raw, project, patch, changes };
}

export default withPlane(async (input: Input) => {
  const { raw, project, patch } = await buildPatch(input);
  if (Object.keys(patch).length === 0) {
    throw new Error(
      "Nothing to update. Pass at least one of title, description, state, priority, assignees, or dates.",
    );
  }
  await planeRequest<RawWorkItem>(workspacePath("projects", project.id, "work-items", raw.id), {
    method: "PATCH",
    body: patch,
  });
  const { raw: updated } = await fetchWorkItem(`${project.identifier}-${raw.sequence_id}`);
  return serializeWorkItem(updated, project);
});

export const confirmation: Tool.Confirmation<Input> = withPlane(async (input: Input) => {
  const { raw, project, changes } = await buildPatch(input);
  return {
    message: `Update ${project.identifier}-${raw.sequence_id}: ${raw.name}?`,
    info: changes,
  };
});
