// Pure helpers for AI Chat list mentions. Keep runtime imports out of this file so tests can load it directly.

export const MAX_MENTIONS = 50;
/** Reminders a mentioned list carries, so a long list cannot fill the model's context. */
export const MAX_RESOURCE_REMINDERS = 200;
const URI_PREFIX = "apple-reminders://lists/";

export type MentionList = { id: string; title: string; color: string; isDefault: boolean; account: string };

export type ListMention = { title: string; uri: string; description?: string; icon: string };

type ResourceReminder = {
  id: string;
  title: string;
  openUrl: string;
  notes?: string | null;
  dueDate?: string | null;
  priority?: string | null;
  isRecurring?: boolean | string;
  recurrenceRule?: string | null;
  location?: unknown;
  attachedUrls?: string[];
};

export function toListMentionUri(listId: string) {
  return `${URI_PREFIX}${encodeURIComponent(listId)}`;
}

export function parseListMentionUri(uri: string) {
  let id = "";
  try {
    id = uri.startsWith(URI_PREFIX) ? decodeURIComponent(uri.slice(URI_PREFIX.length)) : "";
  } catch {
    // A malformed escape is as invalid as a missing ID.
  }
  if (!id.trim()) throw new Error("Invalid Apple Reminders list URI.");
  return id;
}

/** Case- and accent-insensitive, so "cafe" finds "Café". */
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

/**
 * Lists whose name contains every typed word, names starting with the query first. The default list leads the rest, as
 * it is where most reminders go, then lists are ordered by name.
 */
export function filterMentionLists<T extends MentionList>(lists: readonly T[], query: string): T[] {
  const needle = normalize(query.trim());
  const words = needle.split(/\s+/).filter(Boolean);
  const rank = (list: T) => (needle && normalize(list.title).startsWith(needle) ? 0 : 1);

  return lists
    .filter((list) => words.every((word) => normalize(list.title).includes(word)))
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        Number(b.isDefault) - Number(a.isDefault) ||
        a.title.localeCompare(b.title) ||
        a.account.localeCompare(b.account),
    );
}

/**
 * A list row as the Reminders sidebar shows it: its name and its icon in its color. The account is shown only when lists
 * come from more than one, where it tells lists with the same name apart.
 */
export function toListMentions<T extends MentionList>(
  lists: readonly T[],
  query: string,
  icon: (list: T) => string,
): ListMention[] {
  const showAccount = new Set(lists.map((list) => list.account).filter(Boolean)).size > 1;
  return filterMentionLists(lists, query)
    .slice(0, MAX_MENTIONS)
    .map((list) => ({
      title: list.title.trim() || "Untitled",
      uri: toListMentionUri(list.id),
      ...(showAccount && list.account ? { description: list.account } : {}),
      icon: icon(list),
    }));
}

/** The Reminders list icon: a white bulleted list on a circle in the list's color. */
export function listIconSvg(color: string) {
  const rows = [21, 32, 43]
    .map((y) => `<circle cx="20" cy="${y}" r="3.5"/><rect x="27" y="${y - 2.5}" width="20" height="5" rx="2.5"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="${color}"/><g fill="#fff">${rows}</g></svg>`;
}

/** The list's color as `#rrggbb`, or undefined when it is not one. */
export function hexListColor(color: string | null | undefined) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : undefined;
}

/** Only the fields that say something, so each reminder costs as few tokens as possible. */
function toResourceReminder(reminder: ResourceReminder) {
  return {
    id: reminder.id,
    title: reminder.title,
    openUrl: reminder.openUrl,
    ...(reminder.notes?.trim() ? { notes: reminder.notes.trim() } : {}),
    ...(reminder.dueDate ? { dueDate: reminder.dueDate } : {}),
    ...(reminder.priority ? { priority: reminder.priority } : {}),
    ...(reminder.isRecurring && reminder.recurrenceRule ? { recurrence: reminder.recurrenceRule } : {}),
    ...(reminder.location ? { location: reminder.location } : {}),
    ...(reminder.attachedUrls?.length ? { attachedUrls: reminder.attachedUrls } : {}),
  };
}

/**
 * A mentioned list as AI reads it: its ID, so tools can create or find reminders in it without looking it up, and its
 * incomplete reminders as they are when the message is sent.
 */
export function toListResource(list: MentionList, reminders: readonly ResourceReminder[], hasMoreReminders = false) {
  const shown = reminders.slice(0, MAX_RESOURCE_REMINDERS);
  const truncated = hasMoreReminders || reminders.length > shown.length;
  const data = {
    id: list.id,
    title: list.title,
    ...(list.account ? { account: list.account } : {}),
    isDefault: list.isDefault,
    incompleteReminders: shown.map(toResourceReminder),
    ...(truncated
      ? {
          note: `Only the first ${shown.length} incomplete reminders are included. Use get-reminders with this list's ID as listId and searchText to find others.`,
        }
      : {}),
  };
  return { text: JSON.stringify(data, null, 2), mimeType: "application/json" };
}
