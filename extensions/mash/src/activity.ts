// Grouping list rows by when their chat was last active, and saying when.
import type { Hit } from "./mash";

/** How the list groups chats by when they were last active. */
type Activity = "Today" | "This week" | "Earlier";

/** One group of rows, in the order they were ranked; undated rows have no title. */
export interface ActivityGroup {
  readonly title: Activity | undefined;
  readonly hits: Hit[];
}

/**
 * The rows grouped Today, This week (the six days before today) and Earlier
 * by each chat's last activity, in local time. Rows keep their ranked order
 * within a group, so a group's rows do not move as later results arrive. A row
 * Mash gave no time for is listed last, under no heading, rather than guessed.
 */
export function byActivity(hits: readonly Hit[], now: Date): ActivityGroup[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
  const activity = (hit: Hit): Activity | undefined => {
    if (!hit.updatedAt) return undefined;
    const at = hit.updatedAt.getTime();
    return at >= today ? "Today" : at >= weekStart ? "This week" : "Earlier";
  };
  const order: (Activity | undefined)[] = ["Today", "This week", "Earlier", undefined];
  return order
    .map((title) => ({ title, hits: hits.filter((hit) => activity(hit) === title) }))
    .filter((group) => group.hits.length > 0);
}

/** When a chat was last active, as the reading view's sidebar says it: "Today, 10:12". */
export function lastActive(at: Date, now: Date): string {
  const sameDay = at.toDateString() === now.toDateString();
  return sameDay
    ? `Today, ${at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
    : at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
