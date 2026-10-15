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
