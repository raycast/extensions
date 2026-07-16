import { LocalStorage } from "@raycast/api";

export interface Countdown {
  id: string;
  title: string;
  targetDate: string;
  createdAt: string;
}

export interface CountdownState {
  countdowns: Countdown[];
  pinnedIds: string[];
}

const STORAGE_KEY = "countdowns-state-v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function getCountdownState(): Promise<CountdownState> {
  const rawState = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (!rawState) {
    return { countdowns: [], pinnedIds: [] };
  }

  try {
    const parsed = JSON.parse(rawState) as Partial<
      CountdownState & { pinnedId?: string }
    >;
    const countdowns = Array.isArray(parsed.countdowns)
      ? parsed.countdowns.filter(isCountdown)
      : [];
    const countdownIds = new Set(countdowns.map((countdown) => countdown.id));
    const pinnedIds = normalizePinnedIds(
      getPinnedIdsFromState(parsed),
      countdownIds,
    );

    return { countdowns: sortCountdowns(countdowns), pinnedIds };
  } catch {
    return { countdowns: [], pinnedIds: [] };
  }
}

export async function saveCountdownState(state: CountdownState): Promise<void> {
  const countdowns = sortCountdowns(state.countdowns);
  const countdownIds = new Set(countdowns.map((countdown) => countdown.id));
  const pinnedIds = normalizePinnedIds(state.pinnedIds, countdownIds);

  await LocalStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ countdowns, pinnedIds }),
  );
}

export function createCountdownId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dateToKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function keyToDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function getDaysUntil(
  targetDateKey: string,
  today = new Date(),
): number {
  const targetDate = keyToDate(targetDateKey);
  const targetDay =
    Date.UTC(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    ) / MS_PER_DAY;
  const currentDay =
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) /
    MS_PER_DAY;

  return targetDay - currentDay;
}

export function formatDateLabel(targetDateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(keyToDate(targetDateKey));
}

export function formatDaysLabel(days: number): string {
  if (days === 0) {
    return "today";
  }

  if (days === 1) {
    return "1 day left";
  }

  if (days > 1) {
    return `${days} days left`;
  }

  if (days === -1) {
    return "1 day ago";
  }

  return `${Math.abs(days)} days ago`;
}

export function formatShortDaysLabel(days: number): string {
  if (days === 0) {
    return "Today";
  }

  return `${days}d`;
}

export function formatCountdownSummary(countdown: Countdown): string {
  const days = getDaysUntil(countdown.targetDate);

  return `${countdown.title}: ${formatDaysLabel(days)} (${formatDateLabel(countdown.targetDate)})`;
}

export function sortCountdowns(countdowns: Countdown[]): Countdown[] {
  return [...countdowns].sort((first, second) => {
    const byDate = first.targetDate.localeCompare(second.targetDate);

    if (byDate !== 0) {
      return byDate;
    }

    return first.title.localeCompare(second.title);
  });
}

function getPinnedIdsFromState(
  state: Partial<CountdownState & { pinnedId?: string }>,
): string[] {
  const pinnedIds = Array.isArray(state.pinnedIds)
    ? state.pinnedIds.filter((id): id is string => typeof id === "string")
    : [];

  if (typeof state.pinnedId === "string") {
    return [state.pinnedId, ...pinnedIds];
  }

  return pinnedIds;
}

function normalizePinnedIds(
  pinnedIds: string[],
  countdownIds: Set<string>,
): string[] {
  const seenIds = new Set<string>();

  return pinnedIds.filter((id) => {
    if (!countdownIds.has(id) || seenIds.has(id)) {
      return false;
    }

    seenIds.add(id);
    return true;
  });
}

function isCountdown(value: unknown): value is Countdown {
  if (!value || typeof value !== "object") {
    return false;
  }

  const countdown = value as Partial<Countdown>;
  const hasValidTargetDate =
    typeof countdown.targetDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(countdown.targetDate) &&
    dateToKey(keyToDate(countdown.targetDate)) === countdown.targetDate;

  return (
    typeof countdown.id === "string" &&
    typeof countdown.title === "string" &&
    hasValidTargetDate &&
    typeof countdown.createdAt === "string"
  );
}
