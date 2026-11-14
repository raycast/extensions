import { planeRequest, workspacePath } from "./request";
import type { RawActivity, RawPaginated } from "./types";
import { deriveCycleAndModules } from "../helpers/activities";

/** Current cycle and modules of a work item, derived from its latest 100 activities. */
export async function getWorkItemCycleAndModules({ projectId, workItemId }: { projectId: string; workItemId: string }) {
  const response = await planeRequest<RawPaginated<RawActivity>>(
    workspacePath("projects", projectId, "work-items", workItemId, "activities"),
    { query: { per_page: 100, order_by: "-created_at" } },
  );
  return deriveCycleAndModules(response.results ?? []);
}
