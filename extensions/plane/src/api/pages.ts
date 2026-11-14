import { planeRequest, planeRequestV2, toResults, workspacePath } from "./request";
import { getCapabilities, invalidateBackend } from "./work-item-backend";
import type { RawPage, RawPaginated, V2Page } from "./types";
import { nextV2Page, V2Envelope } from "../helpers/work-item-queries";
import { shouldFallBack } from "../helpers/work-item-backends";
import { collectPages, CollectedRows, nextV1Cursor } from "../helpers/paging";
import { MAX_LISTED_PAGES, PAGES_PER_REQUEST } from "../helpers/limits";

export type PagesResult = {
  pages: RawPage[];
  /** True when more than `MAX_LISTED_PAGES` pages exist, so older ones are missing. */
  truncated: boolean;
  /** What was listed, shown when `truncated`. */
  coverage: string;
};

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

/**
 * `GET /api/v2/workspaces/{slug}/pages/` or `.../projects/{project_id}/pages/`, newest first, following
 * the pagination (offset or cursor, per `pagination.style`) up to `MAX_LISTED_PAGES`.
 */
async function getPagesV2(projectId?: string): Promise<CollectedRows<RawPage>> {
  const path = projectId ? workspacePath("projects", projectId, "pages") : workspacePath("pages");
  return collectPages(async (position: { cursor: string } | { offset: number } | undefined) => {
    const envelope = await planeRequestV2<V2Envelope<V2Page>>(path, {
      query: { per_page: PAGES_PER_REQUEST, order_by: "-updated_at", fields: V2_PAGE_FIELDS, ...position },
    });
    return { rows: (envelope.data ?? []).map(fromV2Page), next: nextV2Page(envelope) };
  }, MAX_LISTED_PAGES);
}

/**
 * v1 pages, following `next_cursor` up to `MAX_LISTED_PAGES`. Plane Cloud serves them; Community Edition 1.3.1
 * has no public pages route, so these 404 there.
 */
async function getPagesV1(projectId?: string): Promise<CollectedRows<RawPage>> {
  const path = projectId ? workspacePath("projects", projectId, "pages") : workspacePath("pages");
  return collectPages(async (cursor: string | undefined) => {
    const response = await planeRequest<RawPage[] | RawPaginated<RawPage>>(path, {
      query: { per_page: PAGES_PER_REQUEST, cursor },
    });
    return { rows: toResults(response), next: nextV1Cursor(response) };
  }, MAX_LISTED_PAGES);
}

/**
 * Pages via API v2 when the server has it (Cloud, Commercial), otherwise via v1. If v2 answers 404 or 400,
 * its cached capability is dropped and v1 is tried once. On Community Edition the v1 call 404s and
 * Search Pages shows its "not available" notice.
 */
export async function getPages({ projectId }: { projectId?: string }): Promise<PagesResult> {
  let listed: CollectedRows<RawPage>;
  let ordered = false;
  if ((await getCapabilities()).v2) {
    try {
      listed = await getPagesV2(projectId);
      ordered = true;
    } catch (error) {
      if (!shouldFallBack(error)) throw error;
      invalidateBackend("v2");
      listed = await getPagesV1(projectId);
    }
  } else {
    listed = await getPagesV1(projectId);
  }
  const count = MAX_LISTED_PAGES.toLocaleString("en-US");
  return {
    pages: listed.rows.filter((page) => !page.archived_at),
    truncated: listed.truncated,
    coverage: ordered ? `Showing the ${count} most recently updated pages` : `Showing the first ${count} pages`,
  };
}
