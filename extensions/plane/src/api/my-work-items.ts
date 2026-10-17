import { Cache } from "@raycast/api";
import { Project } from "@makeplane/plane-node-sdk";
import { getCurrentAccessToken, requirePlaneClient } from "./auth";
import { getAllProjects, getMemberProjects } from "./projects";
import { getCurrentUser } from "./users";
import { listProjectWorkItemsRaw, WORK_ITEM_SCAN_FIELDS } from "./work-items";
import { planeRequest, planeRequestV2, workspacePath } from "./request";
import { getCapabilities, invalidateBackend } from "./work-item-backend";
import type { RawPaginated, RawWorkItem, V2WorkItem, WorkItemSummary } from "./types";
import { mapWithConcurrency } from "../helpers/concurrency";
import {
  FILTERED_PAGE_SIZE,
  MAX_FILTERED_CLOSED_ITEMS,
  MAX_FILTERED_OPEN_PAGES,
  MAX_PAGES_PER_PROJECT,
  MAX_PROJECTS,
  MAX_SCAN_REQUESTS,
  SCAN_CONCURRENCY,
} from "../helpers/limits";
import {
  isAssignedTo,
  isCreatedBy,
  isSameScope,
  parseSharedResult,
  ResultScope,
  sharedResultKey,
} from "../helpers/my-work-items";
import { accountKey } from "../helpers/keys";
import { getApiBasePath } from "../helpers/urls";
import { getSharedScan, sharedScanKey } from "../helpers/shared-scan";
import {
  BackendKind,
  backendChain,
  Capabilities,
  MyWorkItemsView,
  parseV2User,
  runWithFallback,
  supportedViews,
  V2User,
  VIEW_PARAMS,
} from "../helpers/work-item-backends";
import {
  buildCustomWorkItemQuery,
  buildV2WorkItemQuery,
  CLOSED_STATE_GROUPS,
  CustomWorkItemFilters,
  nextV2Page,
  OPEN_STATE_GROUPS,
  V2Envelope,
} from "../helpers/work-item-queries";
import { fromV2WorkItem, ProjectRef, toWorkItemSummary } from "../helpers/work-item-summary";

export type MyWorkItemsResult = {
  view: MyWorkItemsView;
  /** Backend that produced `items`. */
  backend: BackendKind;
  /** Views the current server can serve (Subscribed and Mentions need the custom v1 filters). */
  supportedViews: MyWorkItemsView[];
  me?: { id: string; displayName?: string };
  items: WorkItemSummary[];
  /** True when a cap was hit, so older items may be missing. */
  truncated: boolean;
  /** What was covered, shown when `truncated`. */
  coverage?: string;
  fetchedAt: string;
  /** Server, workspace and account the result was fetched for. */
  scope: ResultScope;
};

type Me = { id: string; displayName?: string };
type BackendResult = Pick<MyWorkItemsResult, "me" | "items" | "truncated" | "coverage">;

/**
 * The last result per base URL, workspace, account and view, shared by the command, the menu bar and the list-my-work-items tool.
 * The account is part of the key, so after switching API keys in the same workspace the previous account's
 * items are never shown.
 */
const resultStore = new Cache({ namespace: "plane-my-work-items" });

/** The server, workspace and account requests run against right now. */
export function getResultScope(): ResultScope {
  const workspaceSlug = requirePlaneClient().workspaceSlug;
  return { basePath: getApiBasePath(), workspaceSlug, account: accountKey(getCurrentAccessToken()) };
}

function currentScopeOrUndefined(): ResultScope | undefined {
  try {
    return getResultScope();
  } catch {
    return undefined;
  }
}

export function readSharedResult(
  view: MyWorkItemsView,
  scope: ResultScope | undefined = currentScopeOrUndefined(),
): MyWorkItemsResult | undefined {
  if (!scope) return undefined;
  try {
    return parseSharedResult<MyWorkItemsResult>(resultStore.get(sharedResultKey(scope, view)), scope, view);
  } catch {
    return undefined;
  }
}

/**
 * Stores a result under the scope its request started in. A result is dropped when the workspace or account
 * changed while it loaded, since its later requests may have run against the new one.
 */
function writeSharedResult(result: MyWorkItemsResult) {
  if (!isSameScope(result.scope, currentScopeOrUndefined())) return;
  try {
    resultStore.set(sharedResultKey(result.scope, result.view), JSON.stringify(result));
  } catch {
    // Caching is best effort.
  }
}

async function getMe(): Promise<Me> {
  const me = await getCurrentUser();
  if (!me?.id) throw new Error("Could not load the current Plane user.");
  return { id: me.id, displayName: me.displayName };
}

/** Project id → identifier and name, for rows that only carry a project id. Failures leave the map empty. */
async function getProjectRefs(): Promise<Map<string, ProjectRef>> {
  try {
    const projects = await getAllProjects();
    return new Map(
      projects
        .filter((project) => !!project.id)
        .map((project) => [project.id as string, { identifier: project.identifier, name: project.name }]),
    );
  } catch {
    return new Map();
  }
}

function dedupe(items: WorkItemSummary[]): WorkItemSummary[] {
  const byId = new Map<string, WorkItemSummary>();
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

// ---------------------------------------------------------------------------------------------
// Backend 1: Plane API v2 (`GET /api/v2/workspaces/{slug}/work-items/?assignee_id=...`)
// ---------------------------------------------------------------------------------------------

async function getV2Me(capabilities: Capabilities): Promise<V2User> {
  if (capabilities.v2User) return capabilities.v2User;
  const user = parseV2User(await planeRequestV2<unknown>("users/me"));
  if (!user) throw new Error("Could not load the current Plane user.");
  return user;
}

async function listV2(
  filters: Parameters<typeof buildV2WorkItemQuery>[0],
  { perPage, maxPages }: { perPage: number; maxPages: number },
): Promise<{ rows: V2WorkItem[]; hasMore: boolean }> {
  const rows: V2WorkItem[] = [];
  let position: { cursor: string } | { offset: number } | undefined;
  for (let page = 0; page < maxPages; page++) {
    const query = buildV2WorkItemQuery(filters, {
      perPage,
      paginate: "cursor",
      orderBy: "-updated_at",
      expand: "state",
      ...position,
    });
    const envelope = await planeRequestV2<V2Envelope<V2WorkItem>>(workspacePath("work-items"), { query });
    rows.push(...(envelope.data ?? []));
    position = nextV2Page(envelope);
    if (!position) return { rows, hasMore: false };
  }
  return { rows, hasMore: true };
}

async function runV2(view: MyWorkItemsView, capabilities: Capabilities): Promise<BackendResult> {
  if (view !== "assigned") throw new Error(`API v2 has no filter for the ${view} view.`);
  const workspaceSlug = requirePlaneClient().workspaceSlug;
  const me = await getV2Me(capabilities);
  const [open, closed, projects] = await Promise.all([
    listV2(
      { assigneeIds: [me.id], stateGroups: OPEN_STATE_GROUPS },
      { perPage: FILTERED_PAGE_SIZE, maxPages: MAX_FILTERED_OPEN_PAGES },
    ),
    listV2(
      { assigneeIds: [me.id], stateGroups: CLOSED_STATE_GROUPS },
      { perPage: MAX_FILTERED_CLOSED_ITEMS, maxPages: 1 },
    ),
    getProjectRefs(),
  ]);
  const items = [...open.rows, ...closed.rows].map((row) => fromV2WorkItem(row, { workspaceSlug, projects }));
  return {
    me,
    items: dedupe(items),
    truncated: open.hasMore,
    coverage: `Showing the ${open.rows.length} most recently updated open work items`,
  };
}

// ---------------------------------------------------------------------------------------------
// Backend 2: custom v1 filters (`GET /api/v1/workspaces/{slug}/work-items/?assignees=me`)
// ---------------------------------------------------------------------------------------------

async function listCustom(
  filters: CustomWorkItemFilters,
  params: readonly string[],
  { perPage, maxPages }: { perPage: number; maxPages: number },
): Promise<{ rows: RawWorkItem[]; hasMore: boolean }> {
  const rows: RawWorkItem[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const query = buildCustomWorkItemQuery(filters, params, {
      perPage,
      cursor,
      orderBy: "-updated_at",
      fields: WORK_ITEM_SCAN_FIELDS,
      expand: "state",
    });
    const response = await planeRequest<RawPaginated<RawWorkItem>>(workspacePath("work-items"), { query });
    rows.push(...(response.results ?? []));
    if (!response.next_page_results || !response.next_cursor) return { rows, hasMore: false };
    cursor = response.next_cursor;
  }
  return { rows, hasMore: true };
}

const VIEW_FILTERS: Record<MyWorkItemsView, keyof CustomWorkItemFilters> = {
  assigned: "assignees",
  created: "createdBy",
  subscribed: "subscriber",
  mentions: "mentions",
};

async function runCustom(view: MyWorkItemsView, capabilities: Capabilities): Promise<BackendResult> {
  const params = capabilities.custom?.params ?? [];
  if (!params.includes(VIEW_PARAMS[view])) throw new Error(`This server doesn't filter by ${VIEW_PARAMS[view]}.`);
  const workspaceSlug = requirePlaneClient().workspaceSlug;
  const viewFilter: CustomWorkItemFilters = { [VIEW_FILTERS[view]]: ["me"] };
  const splitByState = params.includes("state_group");

  const [me, projects, open, closed] = await Promise.all([
    getMe(),
    getProjectRefs(),
    listCustom(splitByState ? { ...viewFilter, stateGroups: OPEN_STATE_GROUPS } : viewFilter, params, {
      perPage: FILTERED_PAGE_SIZE,
      maxPages: MAX_FILTERED_OPEN_PAGES,
    }),
    splitByState
      ? listCustom({ ...viewFilter, stateGroups: CLOSED_STATE_GROUPS }, params, {
          perPage: MAX_FILTERED_CLOSED_ITEMS,
          maxPages: 1,
        })
      : Promise.resolve({ rows: [] as RawWorkItem[], hasMore: false }),
  ]);

  const items = [...open.rows, ...closed.rows].map((raw) => {
    const project = projects.get(raw.project);
    return toWorkItemSummary(raw, {
      projectIdentifier: project?.identifier ?? "",
      projectName: project?.name,
      workspaceSlug,
    });
  });
  return {
    me,
    items: dedupe(items),
    truncated: open.hasMore,
    coverage: `Showing the ${open.rows.length} most recently updated ${splitByState ? "open " : ""}work items`,
  };
}

// ---------------------------------------------------------------------------------------------
// Backend 3: project scan (stock v1)
// ---------------------------------------------------------------------------------------------

type ScanResult = {
  me: Me;
  items: WorkItemSummary[];
  scannedProjects: number;
  totalProjects: number;
  truncated: boolean;
};

type ScanState = { project: Project; cursor?: string; done: boolean; pages: number };

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

async function runScan(view: MyWorkItemsView, scope: ResultScope): Promise<BackendResult> {
  if (view !== "assigned" && view !== "created") throw new Error(`The project scan can't find ${view} work items.`);
  // Shared per scope, not per view, and reached here whether the scan is first in the chain or a fallback.
  const scan = await getSharedScan({
    store: resultStore,
    key: sharedScanKey(scope),
    view,
    run: scanProjects,
    canStore: () => isSameScope(scope, currentScopeOrUndefined()),
  });
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

// ---------------------------------------------------------------------------------------------

/** Views the server can serve, after probing. */
export async function getSupportedViews(): Promise<MyWorkItemsView[]> {
  return supportedViews(await getCapabilities());
}

/**
 * The current user's work items for one view, from the fastest backend available:
 * API v2, then the custom v1 filters, then the project scan. If a fast backend answers 404 or 400,
 * its cached capability is dropped and the next backend runs once.
 *
 * With `maxAgeMs`, a shared result younger than that is returned without any request. Results are shared per
 * server, workspace and account, captured when the call starts.
 */
export async function getMyWorkItems(
  view: MyWorkItemsView = "assigned",
  options: { maxAgeMs?: number } = {},
): Promise<MyWorkItemsResult> {
  const scope = getResultScope();
  if (options.maxAgeMs !== undefined) {
    const shared = readSharedResult(view, scope);
    if (shared && Date.now() - new Date(shared.fetchedAt).getTime() < options.maxAgeMs) return shared;
  }

  const capabilities = { ...(await getCapabilities()) };
  const chain = backendChain(view, capabilities);
  if (chain.length === 0) {
    throw new Error(`This Plane server can't list ${view} work items.`);
  }

  // v2 and the server filters cost a few requests; the project scan coordinates itself in `runScan`.
  const { value, backend } = await runWithFallback(
    chain,
    (kind) =>
      kind === "v2"
        ? runV2(view, capabilities)
        : kind === "custom"
          ? runCustom(view, capabilities)
          : runScan(view, scope),
    (kind) => {
      invalidateBackend(kind);
      if (kind === "v2") capabilities.v2 = false;
      if (kind === "custom") capabilities.custom = undefined;
    },
  );

  const result: MyWorkItemsResult = {
    ...value,
    view,
    backend,
    supportedViews: supportedViews(capabilities),
    fetchedAt: new Date().toISOString(),
    scope,
  };
  writeSharedResult(result);
  return result;
}
