/** Display order for state groups: things in flight first, closed last. */
export const STATE_GROUP_ORDER = ["triage", "started", "unstarted", "backlog", "completed", "cancelled"] as const;
export type StateGroupName = (typeof STATE_GROUP_ORDER)[number];

export const STATE_GROUP_TITLES: Record<StateGroupName | "other", string> = {
  triage: "Triage",
  started: "In Progress",
  unstarted: "Todo",
  backlog: "Backlog",
  completed: "Done",
  cancelled: "Cancelled",
  other: "Other",
};

const CLOSED_GROUPS: ReadonlySet<string> = new Set(["completed", "cancelled"]);

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };

/** Unknown or missing groups count as open, so nothing silently disappears. */
export function isOpenStateGroup(group: string | undefined | null): boolean {
  return !group || !CLOSED_GROUPS.has(group);
}

export function stateGroupRank(group: string | undefined | null): number {
  const index = STATE_GROUP_ORDER.indexOf((group ?? "") as StateGroupName);
  return index === -1 ? STATE_GROUP_ORDER.length : index;
}

export function priorityRank(priority: string | undefined | null): number {
  return PRIORITY_RANK[priority ?? "none"] ?? PRIORITY_RANK.none;
}

type Groupable = {
  state?: { group?: string } | null;
  priority?: string | null;
  updatedAt?: string | Date | null;
};

function timeOf(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** Sort by state group order, then priority (urgent first), then most recently updated. */
export function compareWorkItems(a: Groupable, b: Groupable): number {
  return (
    stateGroupRank(a.state?.group) - stateGroupRank(b.state?.group) ||
    priorityRank(a.priority) - priorityRank(b.priority) ||
    timeOf(b.updatedAt) - timeOf(a.updatedAt)
  );
}

export type StateGroupSection<T> = {
  group: StateGroupName | "other";
  title: string;
  items: T[];
};

/**
 * Groups items into sections in `STATE_GROUP_ORDER`.
 * Closed groups (completed/cancelled) are dropped unless `includeClosed` is set.
 */
export function groupByStateGroup<T extends Groupable>(
  items: T[],
  options: { includeClosed?: boolean } = {},
): StateGroupSection<T>[] {
  const buckets = new Map<StateGroupName | "other", T[]>();
  for (const item of [...items].sort(compareWorkItems)) {
    const group = item.state?.group;
    if (!options.includeClosed && !isOpenStateGroup(group)) continue;
    const key: StateGroupName | "other" = STATE_GROUP_ORDER.includes(group as StateGroupName)
      ? (group as StateGroupName)
      : "other";
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }
  const order: (StateGroupName | "other")[] = [...STATE_GROUP_ORDER, "other"];
  return order
    .filter((group) => buckets.has(group))
    .map((group) => ({ group, title: STATE_GROUP_TITLES[group], items: buckets.get(group) ?? [] }));
}
