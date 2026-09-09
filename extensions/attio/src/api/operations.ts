/**
 * Single source of truth for what the extension calls and what each call
 * needs (spec D11, §4.6). Endpoints, the guard, action gating and the tests
 * all derive from this map. Scope lists verified live 2026-08-31 (spec §14).
 */

/** Attio defaults to 500/page and score-rates queries across the workspace — keep pages small. */
export const DEFAULT_PAGE_SIZE = 50;

export const OPERATIONS = {
  self: { path: "/v2/self", scopes: [] },
  listObjects: { path: "/v2/objects", scopes: ["object_configuration:read"] },
  createObject: { path: "/v2/objects", scopes: ["object_configuration:read-write"] },
  listAttributes: { path: "/v2/objects/{object}/attributes", scopes: ["object_configuration:read"] },
  listAttributeOptions: {
    path: "/v2/objects/{object}/attributes/{attribute}/options",
    scopes: ["object_configuration:read"],
  },
  listAttributeStatuses: {
    path: "/v2/objects/{object}/attributes/{attribute}/statuses",
    scopes: ["object_configuration:read"],
  },
  queryRecords: {
    path: "/v2/objects/{object}/records/query",
    scopes: ["record_permission:read", "object_configuration:read"],
  },
  searchRecords: {
    path: "/v2/objects/records/search",
    scopes: ["record_permission:read", "object_configuration:read"],
  },
  getRecord: {
    path: "/v2/objects/{object}/records/{record}",
    scopes: ["record_permission:read", "object_configuration:read"],
  },
  updateRecord: {
    path: "/v2/objects/{object}/records/{record}",
    scopes: ["record_permission:read-write", "object_configuration:read"],
  },
  deleteRecord: {
    path: "/v2/objects/{object}/records/{record}",
    scopes: ["record_permission:read-write", "object_configuration:read"],
  },
  listLists: { path: "/v2/lists", scopes: ["list_configuration:read"] },
  listListViews: { path: "/v2/lists/{list}/views", scopes: ["list_configuration:read"] },
  listNotes: { path: "/v2/notes", scopes: ["note:read", "object_configuration:read", "record_permission:read"] },
  updateNote: {
    path: "/v2/notes/{note}",
    scopes: ["note:read-write", "object_configuration:read", "record_permission:read"],
  },
  listTasks: {
    path: "/v2/tasks",
    scopes: ["task:read", "object_configuration:read", "record_permission:read", "user_management:read"],
  },
  createTask: {
    path: "/v2/tasks",
    scopes: ["task:read-write", "object_configuration:read", "record_permission:read", "user_management:read"],
  },
  updateTask: {
    path: "/v2/tasks/{task}",
    scopes: ["task:read-write", "object_configuration:read", "record_permission:read", "user_management:read"],
  },
  deleteTask: { path: "/v2/tasks/{task}", scopes: ["task:read-write"] },
  listMembers: { path: "/v2/workspace_members", scopes: ["user_management:read"] },
  listWebhooks: { path: "/v2/webhooks", scopes: ["webhook:read"] },
  createWebhook: { path: "/v2/webhooks", scopes: ["webhook:read-write"] },
  updateWebhook: { path: "/v2/webhooks/{webhook}", scopes: ["webhook:read-write"] },
  deleteWebhook: { path: "/v2/webhooks/{webhook}", scopes: ["webhook:read-write"] },
} as const satisfies Record<string, { path: string; scopes: readonly string[] }>;

export type Operation = keyof typeof OPERATIONS;
/** Derived from the map — the count cannot drift from the declarations. */
export type Scope = (typeof OPERATIONS)[Operation]["scopes"][number];

/** Space-separated scope string from /v2/self → list. Unknown scopes are kept. */
export const parseScopes = (s?: string): string[] => (s ?? "").split(" ").filter(Boolean);

/**
 * ":read-write" satisfies a ":read" requirement — verified live three times
 * (spec §14). granted is Set<string> (may hold scopes we don't model).
 */
export const satisfied = (granted: ReadonlySet<string>, needed: Scope): boolean =>
  granted.has(needed) || (needed.endsWith(":read") && granted.has(needed.replace(/:read$/, ":read-write")));

export const missingScopes = (granted: ReadonlySet<string>, op: Operation): Scope[] =>
  OPERATIONS[op].scopes.filter((s) => !satisfied(granted, s));
