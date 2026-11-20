export interface TicketTimeActivity {
  id: number;
  date: string;
  seconds?: number;
  worked_seconds?: number;
  hours?: number;
  user: { id: number };
  timer_started_at?: string | null;
}

export interface TicketTimeSummary {
  totalSeconds: number;
  todaySeconds: number;
  bookings: number;
  running: boolean;
}

export interface ActivityPage<T> {
  activities: T[];
  nextPage?: number;
  total?: number;
}

// Follow page numbers only: never send MOCO credentials to a URL supplied by a pagination header.
export function nextActivityPage(link: string | undefined, currentPage: number): number | undefined {
  if (!link) return undefined;
  const next = link.split(/,\s*(?=<)/).find((part) => /;\s*rel\s*=\s*"?next"?(?:\s|;|$)/i.test(part));
  if (!next) return undefined;
  const target = next.match(/<([^>]+)>/)?.[1];
  if (!target) throw new Error("Invalid activity pagination.");
  const values = new URL(target, "https://example.invalid").searchParams.getAll("page");
  const page = Number(values[0]);
  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0]) || !Number.isSafeInteger(page) || page <= currentPage)
    throw new Error("Invalid activity pagination.");
  return page;
}

export async function readActivityPages<T extends { id: number }>(
  fetchPage: (page: number) => Promise<ActivityPage<T>>,
): Promise<T[]> {
  const activities = new Map<number, T>();
  let page = 1;
  let expectedTotal: number | undefined;
  for (let count = 0; count < 100; count++) {
    const result = await fetchPage(page);
    result.activities.forEach((activity) => activities.set(activity.id, activity));
    if (result.total !== undefined) expectedTotal = result.total;
    if (result.nextPage === undefined) {
      if (expectedTotal !== undefined && activities.size < expectedTotal)
        throw new Error("Incomplete activity history.");
      return [...activities.values()];
    }
    if (!Number.isSafeInteger(result.nextPage) || result.nextPage <= page)
      throw new Error("Invalid activity pagination.");
    page = result.nextPage;
  }
  throw new Error("Activity history is too large to load completely.");
}

export function summarizeTicketTime(
  activities: TicketTimeActivity[],
  userId: number,
  today: string,
): TicketTimeSummary {
  const result = { totalSeconds: 0, todaySeconds: 0, bookings: 0, running: false };
  const seen = new Set<number>();
  for (const activity of activities) {
    if (activity.user.id !== userId || seen.has(activity.id)) continue;
    seen.add(activity.id);
    const seconds =
      activity.worked_seconds ??
      activity.seconds ??
      (activity.hours === undefined ? undefined : Math.round(activity.hours * 3600));
    if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0)
      throw new Error("Invalid recorded activity time.");
    result.totalSeconds += seconds;
    if (activity.date === today) result.todaySeconds += seconds;
    result.bookings++;
    result.running ||= Boolean(activity.timer_started_at);
  }
  return result;
}

export function formatTicketDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const rest = rounded % 60;
  return (
    [hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", rest ? `${rest}s` : ""].filter(Boolean).join(" ") || "0m"
  );
}

export function ticketTimeText(summary: TicketTimeSummary): string {
  return `${formatTicketDuration(summary.totalSeconds)} total · ${formatTicketDuration(summary.todaySeconds)} today · ${summary.bookings} ${summary.bookings === 1 ? "booking" : "bookings"}`;
}
