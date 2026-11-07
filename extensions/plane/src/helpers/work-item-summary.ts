import type {
  RawLabelLite,
  RawStateLite,
  RawUserLite,
  RawWorkItem,
  V2WorkItem,
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

export type ProjectRef = { identifier?: string; name?: string };

/** `ENG` from `ENG-142`. */
export function projectIdentifierFromKey(key: string | undefined): string | undefined {
  const match = key?.match(/^(.+)-\d+$/);
  return match ? match[1] : undefined;
}

/**
 * Converts a v2 work item row into a `WorkItemSummary`. The project identifier comes from `projects`
 * (keyed by project id) or, failing that, from the row's `identifier` (`ENG-142`).
 */
export function fromV2WorkItem(
  raw: V2WorkItem,
  context: { workspaceSlug: string; projects?: ReadonlyMap<string, ProjectRef> },
): WorkItemSummary {
  const project = context.projects?.get(raw.project_id);
  const state = raw.state && typeof raw.state === "object" ? raw.state : undefined;
  return {
    id: raw.id,
    name: raw.name,
    projectId: raw.project_id,
    projectIdentifier: project?.identifier ?? projectIdentifierFromKey(raw.identifier) ?? "",
    projectName: project?.name,
    sequenceId: raw.sequence_id,
    workspaceSlug: context.workspaceSlug,
    stateId: raw.state_id ?? state?.id ?? null,
    state,
    priority: raw.priority,
    assigneeIds: raw.assignee_ids ?? [],
    labelIds: raw.label_ids ?? [],
    createdBy: raw.created_by_id ?? null,
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
