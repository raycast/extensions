import { Cache } from "@raycast/api";
import { Project } from "@makeplane/plane-node-sdk";
import { requirePlaneClient } from "./auth";
import { getMemberProjects } from "./projects";
import { getCurrentUser } from "./users";
import { listProjectWorkItemsRaw, WORK_ITEM_SCAN_FIELDS } from "./work-items";
import type { WorkItemSummary } from "./types";
import { mapWithConcurrency } from "../helpers/concurrency";
import { MAX_PAGES_PER_PROJECT, MAX_PROJECTS, MAX_SCAN_REQUESTS, SCAN_CONCURRENCY } from "../helpers/limits";
import { isAssignedTo, isCreatedBy, MyWorkItemsFilter } from "../helpers/my-work-items";
import { getApiBasePath } from "../helpers/urls";
import { withScanLease } from "../helpers/scan-lease";
import { toWorkItemSummary } from "../helpers/work-item-summary";

export type MyWorkItemsResult = {
  view: MyWorkItemsFilter;
  me?: { id: string; displayName?: string };
  items: WorkItemSummary[];
  /** True when a cap was hit, so older items may be missing. */
  truncated: boolean;
  /** What was covered, shown when `truncated`. */
  coverage?: string;
  fetchedAt: string;
};

type Me = { id: string; displayName?: string };

const SCAN_MEMO_MS = 60 * 1000;

/** The last result per base URL, workspace and view, shared by the command and the menu bar. */
const resultStore = new Cache({ namespace: "plane-my-work-items" });

function resultKey(view: MyWorkItemsFilter) {
  return `${getApiBasePath()}|${requirePlaneClient().workspaceSlug}|${view}`;
}

export function readSharedResult(view: MyWorkItemsFilter): MyWorkItemsResult | undefined {
  try {
    const raw = resultStore.get(resultKey(view));
    const result = raw ? (JSON.parse(raw) as MyWorkItemsResult) : undefined;
    return result?.view === view && Array.isArray(result.items) ? result : undefined;
  } catch {
    return undefined;
  }
}

function writeSharedResult(result: MyWorkItemsResult) {
  try {
    resultStore.set(resultKey(result.view), JSON.stringify(result));
  } catch {
    // Caching is best effort.
  }
}

async function getMe(): Promise<Me> {
  const me = await getCurrentUser();
  if (!me?.id) throw new Error("Could not load the current Plane user.");
  return { id: me.id, displayName: me.displayName };
}

type ScanResult = {
  me: Me;
  items: WorkItemSummary[];
  scannedProjects: number;
  totalProjects: number;
  truncated: boolean;
};

type ScanState = { project: Project; cursor?: string; done: boolean; pages: number };

let scanMemo: { key: string; at: number; promise: Promise<ScanResult>; served: Set<MyWorkItemsFilter> } | undefined;

/**
 * Work items assigned to or created by the current user, across member projects.
 *
 * Verified against plane/api/views/issue.py @ v1.3.1: `GET .../work-items/` supports only
 * cursor/per_page/order_by/fields/expand/external_id filters, no assignee filter. So we page through
 * each member project ordered by `-updated_at` and filter on the client, with caps and limited concurrency.
 */
async function scanProjects(): Promise<ScanResult> {
  const client = requirePlaneClient();
  const me = await getMe();

  const memberProjects = await getMemberProjects();
  const projects = memberProjects.filter((project) => !!project.id).slice(0, MAX_PROJECTS);
  const states: ScanState[] = projects.map((project) => ({ project, done: false, pages: 0 }));
  const items: WorkItemSummary[] = [];
  let requests = 0;

  while (requests < MAX_SCAN_REQUESTS) {
    const round = states
      .filter((state) => !state.done && state.pages < MAX_PAGES_PER_PROJECT)
      .slice(0, MAX_SCAN_REQUESTS - requests);
    if (round.length === 0) break;
    requests += round.length;

    await mapWithConcurrency(round, SCAN_CONCURRENCY, async (state) => {
      const response = await listProjectWorkItemsRaw({
        projectId: state.project.id as string,
        cursor: state.cursor,
        perPage: 100,
        orderBy: "-updated_at",
        expand: "state",
        fields: WORK_ITEM_SCAN_FIELDS,
      });
      state.pages += 1;
      state.cursor = response.next_cursor;
      state.done = !response.next_page_results || !response.next_cursor;
      for (const raw of response.results ?? []) {
        const summary = toWorkItemSummary(raw, {
          projectIdentifier: state.project.identifier,
          projectName: state.project.name,
          workspaceSlug: client.workspaceSlug,
        });
        if (isAssignedTo(summary, me.id) || isCreatedBy(summary, me.id)) {
          items.push(summary);
        }
      }
    });
  }

  return {
    me,
    items,
    scannedProjects: projects.length,
    totalProjects: memberProjects.length,
    truncated: memberProjects.length > projects.length || states.some((state) => !state.done),
  };
}

/**
 * One scan serves both Assigned and Created, so switching views within a minute doesn't scan again.
 * Asking for a view the scan already served is a refresh (e.g. after an edit) and scans again.
 */
function scanProjectsMemoized(view: MyWorkItemsFilter): Promise<ScanResult> {
  const key = `${getApiBasePath()}|${requirePlaneClient().workspaceSlug}`;
  const now = Date.now();
  if (scanMemo && scanMemo.key === key && now - scanMemo.at < SCAN_MEMO_MS && !scanMemo.served.has(view)) {
    scanMemo.served.add(view);
    return scanMemo.promise;
  }
  const promise = scanProjects();
  scanMemo = { key, at: now, promise, served: new Set([view]) };
  promise.catch(() => {
    if (scanMemo?.promise === promise) scanMemo = undefined;
  });
  return promise;
}

async function runScan(view: MyWorkItemsFilter): Promise<Omit<MyWorkItemsResult, "view" | "fetchedAt">> {
  const scan = await scanProjectsMemoized(view);
  const items = scan.items.filter((item) =>
    view === "assigned" ? isAssignedTo(item, scan.me.id) : isCreatedBy(item, scan.me.id),
  );
  return {
    me: scan.me,
    items,
    truncated: scan.truncated,
    coverage: `Scanned the ${MAX_PAGES_PER_PROJECT * 100} most recently updated work items in ${scan.scannedProjects} of ${scan.totalProjects} projects`,
  };
}

/**
 * The current user's work items for one view, from a scan of their member projects. The scan is coordinated
 * across commands with a lease, so the menu bar and My Work Items never scan at the same time.
 *
 * With `maxAgeMs`, a shared result younger than that is returned without any request.
 */
export async function getMyWorkItems(
  view: MyWorkItemsFilter = "assigned",
  options: { maxAgeMs?: number } = {},
): Promise<MyWorkItemsResult> {
  if (options.maxAgeMs !== undefined) {
    const shared = readSharedResult(view);
    if (shared && Date.now() - new Date(shared.fetchedAt).getTime() < options.maxAgeMs) return shared;
  }

  const fetchFresh = async (): Promise<MyWorkItemsResult> => {
    const result: MyWorkItemsResult = { ...(await runScan(view)), view, fetchedAt: new Date().toISOString() };
    writeSharedResult(result);
    return result;
  };

  return withScanLease({
    store: resultStore,
    leaseKey: `${resultKey(view)}|scan-lease`,
    readResult: () => {
      const shared = readSharedResult(view);
      return shared ? { value: shared, fetchedAt: new Date(shared.fetchedAt).getTime() } : undefined;
    },
    run: fetchFresh,
  });
}
