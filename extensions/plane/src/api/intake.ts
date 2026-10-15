import { planeRequest, workspacePath } from "./request";
import { IntakeStatus, RawIntakeItem, RawPaginated } from "./types";

/**
 * Open intake items for a project.
 * Route verified in plane/api/urls/intake.py @ v1.3.1:
 * `workspaces/{slug}/projects/{project_id}/intake-issues/` (GET, POST) and `.../intake-issues/{issue_id}/` (GET, PATCH, DELETE).
 * The list returns an empty page when intake is disabled for the project.
 */
export async function getIntakeItems({ projectId, cursor }: { projectId: string; cursor?: string }) {
  const response = await planeRequest<RawPaginated<RawIntakeItem>>(
    workspacePath("projects", projectId, "intake-issues"),
    {
      query: { per_page: 100, cursor },
    },
  );
  return {
    data: response.results ?? [],
    hasMore: !!response.next_page_results,
    cursor: response.next_cursor,
  };
}

export type IntakeUpdate =
  | { status: typeof IntakeStatus.Accepted }
  | { status: typeof IntakeStatus.Rejected }
  | { status: typeof IntakeStatus.Snoozed; snoozed_till: string }
  | { status: typeof IntakeStatus.Duplicate; duplicate_to: string };

/**
 * Updates the triage status. Note the path uses the underlying work item id (`issue`), not the intake row id.
 * Accepting moves the work item from the Triage state to the project's default state (server side).
 */
export async function updateIntakeItem({
  projectId,
  workItemId,
  update,
}: {
  projectId: string;
  workItemId: string;
  update: IntakeUpdate;
}): Promise<RawIntakeItem> {
  return planeRequest<RawIntakeItem>(workspacePath("projects", projectId, "intake-issues", workItemId), {
    method: "PATCH",
    body: update,
  });
}

export function getIntakeStatusLabel(status: number | undefined): string {
  switch (status) {
    case IntakeStatus.Pending:
      return "Pending";
    case IntakeStatus.Rejected:
      return "Declined";
    case IntakeStatus.Snoozed:
      return "Snoozed";
    case IntakeStatus.Accepted:
      return "Accepted";
    case IntakeStatus.Duplicate:
      return "Duplicate";
    default:
      return "Unknown";
  }
}
