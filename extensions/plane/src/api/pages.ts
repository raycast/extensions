import { planeRequest, planeRequestV2, toResults, workspacePath } from "./request";
import { getCapabilities, invalidateBackend } from "./work-item-backend";
import type { RawPage, RawPaginated, V2Page } from "./types";
import type { V2Envelope } from "../helpers/work-item-queries";
import { shouldFallBack } from "../helpers/work-item-backends";

/** v2 list rows leave out descriptions unless `?fields=` names them. */
const V2_PAGE_FIELDS = [
  "id",
  "name",
  "description_html",
  "description_stripped",
  "created_at",
  "updated_at",
  "archived_at",
  "is_locked",
  "access",
].join(",");

export function fromV2Page(page: V2Page): RawPage {
  return {
    id: page.id,
    name: page.name,
    description_html: page.description_html,
    description_stripped: page.description_stripped,
    created_at: page.created_at,
    updated_at: page.updated_at,
    archived_at: page.archived_at,
    is_locked: page.is_locked,
    access: page.access,
    owned_by: page.owned_by_id ?? undefined,
  };
}

/** `GET /api/v2/workspaces/{slug}/pages/` or `.../projects/{project_id}/pages/` (first 100, newest first). */
async function getPagesV2(projectId?: string): Promise<RawPage[]> {
  const path = projectId ? workspacePath("projects", projectId, "pages") : workspacePath("pages");
  const envelope = await planeRequestV2<V2Envelope<V2Page>>(path, {
    query: { per_page: 100, order_by: "-updated_at", fields: V2_PAGE_FIELDS },
  });
  return (envelope.data ?? []).map(fromV2Page);
}

/** v1 pages: Plane Cloud serves them; Community Edition 1.3.1 has no public pages route, so these 404 there. */
async function getPagesV1(projectId?: string): Promise<RawPage[]> {
  const path = projectId ? workspacePath("projects", projectId, "pages") : workspacePath("pages");
  const response = await planeRequest<RawPage[] | RawPaginated<RawPage>>(path, { query: { per_page: 100 } });
  return toResults(response);
}

/**
 * Pages via API v2 when the server has it (Cloud, Commercial), otherwise via v1. If v2 answers 404 or 400,
 * its cached capability is dropped and v1 is tried once. On Community Edition the v1 call 404s and
 * Search Pages shows its "not available" notice.
 */
export async function getPages({ projectId }: { projectId?: string }): Promise<RawPage[]> {
  let pages: RawPage[];
  if ((await getCapabilities()).v2) {
    try {
      pages = await getPagesV2(projectId);
    } catch (error) {
      if (!shouldFallBack(error)) throw error;
      invalidateBackend("v2");
      pages = await getPagesV1(projectId);
    }
  } else {
    pages = await getPagesV1(projectId);
  }
  return pages.filter((page) => !page.archived_at);
}
