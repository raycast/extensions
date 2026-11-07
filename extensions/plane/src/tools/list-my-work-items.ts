import { getMyWorkItems, getSupportedViews } from "../api/my-work-items";
import { getWorkItemUrlWithIdentifier } from "../helpers/work-items";
import { compareWorkItems, isOpenStateGroup } from "../helpers/state-groups";
import { withPlane } from "../helpers/with-plane";
import { SHARED_RESULT_MAX_AGE_MS } from "../helpers/limits";
import { BACKEND_LABELS } from "../helpers/work-item-backends";

type Input = {
  /**
   * "assigned" (default) for work items assigned to the user, "created" for ones they created,
   * "subscribed" for ones they are subscribed to, "mentions" for ones that mention them.
   * "subscribed" and "mentions" only work on servers with server-side filters.
   */
  filter?: "assigned" | "created" | "subscribed" | "mentions";
  /** Include completed and cancelled work items (default false). */
  includeCompleted?: boolean;
  /** Optional project identifier (e.g. ENG) to limit results to. */
  project?: string;
};

/**
 * Uses the fastest backend the server offers (API v2, server-side v1 filters, or a scan of recently updated
 * work items per project), and reuses a result the command or menu bar fetched in the last two minutes.
 */
export default withPlane(async (input: Input) => {
  const view = input.filter ?? "assigned";
  const views = await getSupportedViews();
  if (!views.includes(view)) {
    return {
      count: 0,
      workItems: [],
      note: `This Plane server can't list ${view} work items. Available: ${views.join(", ")}.`,
    };
  }

  const result = await getMyWorkItems(view, { maxAgeMs: SHARED_RESULT_MAX_AGE_MS });
  const projectFilter = input.project?.trim().toUpperCase();
  const items = result.items
    .filter((item) => input.includeCompleted || isOpenStateGroup(item.state?.group))
    .filter((item) => !projectFilter || item.projectIdentifier.toUpperCase() === projectFilter)
    .sort(compareWorkItems);

  const notes = [
    result.truncated
      ? `${result.coverage ?? "Only recently updated work items were loaded"}; older ones may be missing.`
      : undefined,
    input.includeCompleted && result.backend !== "scan"
      ? "Completed and cancelled work items are limited to the most recently updated ones."
      : undefined,
  ].filter(Boolean);

  return {
    user: result.me?.displayName,
    source: BACKEND_LABELS[result.backend],
    count: items.length,
    note: notes.length > 0 ? notes.join(" ") : undefined,
    workItems: items.map((item) => {
      const identifier = `${item.projectIdentifier}-${item.sequenceId}`;
      return {
        id: item.id,
        identifier,
        name: item.name,
        url: getWorkItemUrlWithIdentifier(item.workspaceSlug, identifier),
        project: item.projectIdentifier,
        state: item.state?.name,
        stateGroup: item.state?.group,
        priority: item.priority,
        dueDate: item.targetDate ?? undefined,
        updatedAt: item.updatedAt,
      };
    }),
  };
});
