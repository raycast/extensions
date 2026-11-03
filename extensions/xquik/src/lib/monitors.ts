import { request } from "./api";
import { ACCOUNT_EVENT_LABELS, EventFilter, POST_EVENT_LABELS } from "./events";
import { Monitor, monitorDeletionSchema, monitorPageSchema, monitorSchema } from "./schemas";

const PAGE_SIZE = 20;

export type MonitorDraft = { target: string; name?: string; eventTypes: string[] };

export type MonitorPage = { monitors: Monitor[]; nextCursor: string | undefined };

type MonitorKindEntry = {
  title: string;
  targetTitle: string;
  targetPlaceholder: string;
  listPath: string;
  itemPath: (id: string) => string;
  createBody: (draft: MonitorDraft) => object;
  eventLabels: Record<string, string>;
  eventFilter: (id: string) => EventFilter;
};

export const MONITOR_KINDS = {
  account: {
    title: "Accounts",
    targetTitle: "Account",
    targetPlaceholder: "Username or User ID",
    listPath: "/monitors",
    itemPath: (id) => `/monitors/${encodeURIComponent(id)}`,
    createBody: ({ target, name, eventTypes }) => ({ username: target, name, eventTypes }),
    eventLabels: ACCOUNT_EVENT_LABELS,
    eventFilter: (id) => ({ monitorId: id }),
  },
  keyword: {
    title: "Keywords",
    targetTitle: "Query",
    targetPlaceholder: "Words or X Operators",
    listPath: "/monitors/keywords",
    itemPath: (id) => `/monitors/keywords/${encodeURIComponent(id)}`,
    createBody: ({ target, name, eventTypes }) => ({ query: target, name, eventTypes }),
    eventLabels: POST_EVENT_LABELS,
    eventFilter: (id) => ({ keywordMonitorId: id }),
  },
} satisfies Record<string, MonitorKindEntry>;

export type MonitorKind = keyof typeof MONITOR_KINDS;

export function monitorTarget({ id, username, query }: Monitor): string {
  return username ? `@${username}` : (query ?? id);
}

export async function fetchMonitorPage(kind: MonitorKind, cursor?: string): Promise<MonitorPage> {
  const query = { limit: PAGE_SIZE, after: cursor };
  const page = await request(monitorPageSchema, MONITOR_KINDS[kind].listPath, { query });
  return { monitors: page.monitors, nextCursor: page.hasMore ? page.nextCursor || undefined : undefined };
}

export function createMonitor(kind: MonitorKind, draft: MonitorDraft): Promise<Monitor> {
  const { listPath, createBody } = MONITOR_KINDS[kind];
  return request(monitorSchema, listPath, { method: "POST", body: createBody(draft) });
}

export function setMonitorActive(kind: MonitorKind, id: string, isActive: boolean): Promise<Monitor> {
  return request(monitorSchema, MONITOR_KINDS[kind].itemPath(id), { method: "PATCH", body: { isActive } });
}

export async function deleteMonitor(kind: MonitorKind, id: string): Promise<void> {
  await request(monitorDeletionSchema, MONITOR_KINDS[kind].itemPath(id), { method: "DELETE" });
}
