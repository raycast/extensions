/**
 * Any.do's API has no tag or priority fields, so both are encoded inside the task note:
 *   "!! #منزل #کار خرید نان"
 *   !! = فوری (3)   ! = مهم (2)   ! = کم (1) — one, two and three exclamation marks.
 */
export type Priority = 0 | 1 | 2 | 3;

export interface NoteMeta {
  tags: string[];
  priority: Priority;
  /** The note with the markers removed. */
  text: string;
}

const TAG_PATTERN = /#([\p{L}\p{N}_-]+)/gu;

export function parseNote(note?: string | null): NoteMeta {
  const raw = note ?? "";
  const tags = [...raw.matchAll(TAG_PATTERN)].map((match) => match[1]);
  const text = raw
    .replace(TAG_PATTERN, " ")
    .replace(/!{1,3}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const marks = (raw.match(/!/g) ?? []).length;
  const priority = Math.min(3, marks) as Priority;
  return { tags, priority, text };
}

/** Builds the note from its parts (markers first, then the human text). */
export function composeNote(
  text: string,
  tags: string[],
  priority: Priority,
): string {
  const parts: string[] = [];
  if (priority > 0) parts.push("!".repeat(priority));
  if (tags.length > 0) {
    parts.push(
      tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" "),
    );
  }
  const body = text.trim();
  if (body) parts.push(body);
  return parts.join(" ").trim();
}

export function normalizeTags(input: string): string[] {
  return input
    .split(/[\s,،]+/)
    .map((tag) => tag.replace(/^#+/, "").trim())
    .filter((tag) => tag.length > 0);
}

export function priorityLabel(priority: Priority, english = false): string {
  switch (priority) {
    case 3:
      return english ? "Urgent" : "فوری";
    case 2:
      return english ? "Important" : "مهم";
    case 1:
      return english ? "Low" : "کم";
    default:
      return english ? "None" : "بدون اولویت";
  }
}

export function hasMarkers(note?: string | null): boolean {
  const meta = parseNote(note);
  return meta.tags.length > 0 || meta.priority > 0;
}
