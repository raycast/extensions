import type {
  RawLabelLite,
  RawStateLite,
  RawUserLite,
  RawWorkItem,
  WorkItemChange,
  WorkItemSummary,
} from "../api/types";

function idOf(value: string | { id: string }): string {
  return typeof value === "string" ? value : value.id;
}

export function getAssigneeIds(raw: RawWorkItem): string[] {
  return (raw.assignees ?? []).map(idOf);
}

export function getLabelIds(raw: RawWorkItem): string[] {
  return (raw.labels ?? []).map(idOf);
}

export function getExpandedAssignees(raw: RawWorkItem): RawUserLite[] {
  return (raw.assignees ?? []).filter((value): value is RawUserLite => typeof value !== "string");
}

export function getExpandedLabels(raw: RawWorkItem): RawLabelLite[] {
  return (raw.labels ?? []).filter((value): value is RawLabelLite => typeof value !== "string");
}

export function getExpandedState(raw: RawWorkItem): RawStateLite | undefined {
  return raw.state && typeof raw.state === "object" ? raw.state : undefined;
}

/** Converts a raw v1 work item (optionally with `expand=state`) into a `WorkItemSummary`. */
export function toWorkItemSummary(
  raw: RawWorkItem,
  context: { projectIdentifier: string; workspaceSlug: string; projectName?: string },
): WorkItemSummary {
  const state = getExpandedState(raw);
  return {
    id: raw.id,
    name: raw.name,
    projectId: raw.project,
    projectIdentifier: context.projectIdentifier,
    projectName: context.projectName,
    sequenceId: raw.sequence_id,
    workspaceSlug: context.workspaceSlug,
    stateId: state ? state.id : typeof raw.state === "string" ? raw.state : null,
    state,
    priority: raw.priority,
    assigneeIds: getAssigneeIds(raw),
    labelIds: getLabelIds(raw),
    createdBy: raw.created_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    startDate: raw.start_date,
    targetDate: raw.target_date,
    descriptionHtml: raw.description_html,
  };
}

/** Applies an optimistic change to a summary (returns a new object). */
export function applyWorkItemChange(item: WorkItemSummary, change: WorkItemChange): WorkItemSummary {
  return {
    ...item,
    ...(change.stateId !== undefined ? { stateId: change.stateId, state: change.state ?? item.state } : {}),
    ...(change.priority !== undefined ? { priority: change.priority } : {}),
    ...(change.assigneeIds !== undefined ? { assigneeIds: change.assigneeIds } : {}),
  };
}

/** Returns the assignee list after toggling `userId`. */
export function toggleAssignee(assigneeIds: string[] | undefined, userId: string): string[] {
  const current = assigneeIds ?? [];
  return current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
}
