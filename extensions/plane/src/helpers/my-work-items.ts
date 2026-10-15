import { isOpenStateGroup } from "./state-groups";

export type MyWorkItemsFilter = "assigned" | "created";

type Mine = {
  assigneeIds?: string[];
  createdBy?: string | null;
  state?: { group?: string } | null;
};

export function isAssignedTo(item: Mine, userId: string | undefined): boolean {
  return !!userId && !!item.assigneeIds?.includes(userId);
}

export function isCreatedBy(item: Mine, userId: string | undefined): boolean {
  return !!userId && item.createdBy === userId;
}

/** Client-side filter used because the v1 list endpoint has no assignee / creator query params. */
export function filterMyWorkItems<T extends Mine>(items: T[], userId: string | undefined, filter: MyWorkItemsFilter) {
  return items.filter((item) => (filter === "assigned" ? isAssignedTo(item, userId) : isCreatedBy(item, userId)));
}

/** Open (not completed/cancelled) items assigned to the user. */
export function getOpenAssignedWorkItems<T extends Mine>(items: T[], userId: string | undefined): T[] {
  return items.filter((item) => isAssignedTo(item, userId) && isOpenStateGroup(item.state?.group));
}

export function countOpenAssignedWorkItems(items: Mine[], userId: string | undefined): number {
  return getOpenAssignedWorkItems(items, userId).length;
}

/** Menu bar title: the count, or nothing when there is nothing open. */
export function getMenuBarTitle(count: number | undefined): string | undefined {
  return count && count > 0 ? String(count) : undefined;
}

/**
 * Who and where a shared My Work Items result belongs to: the server, the workspace, and the account
 * (a short hash of the token, see `accountKey`). Captured when a request starts.
 */
export type ResultScope = { basePath: string; workspaceSlug: string; account: string };

/** Cache key of the shared result for one view in one scope. */
export function sharedResultKey(scope: ResultScope, view: string): string {
  return `${scope.basePath}|${scope.workspaceSlug}|${scope.account}|${view}`;
}

export function isSameScope(a: ResultScope | undefined, b: ResultScope | undefined): boolean {
  return !!a && !!b && a.basePath === b.basePath && a.workspaceSlug === b.workspaceSlug && a.account === b.account;
}

/** A stored result, or undefined unless it is for `view` and was fetched in `scope`. */
export function parseSharedResult<T extends { view: string; items: unknown; scope?: ResultScope }>(
  raw: string | undefined,
  scope: ResultScope,
  view: string,
): T | undefined {
  if (!raw) return undefined;
  try {
    const result = JSON.parse(raw) as T;
    return result?.view === view && Array.isArray(result.items) && isSameScope(result.scope, scope)
      ? result
      : undefined;
  } catch {
    return undefined;
  }
}
