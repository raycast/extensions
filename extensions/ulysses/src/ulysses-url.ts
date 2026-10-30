// Builds Ulysses x-callback URLs.
// Reference: https://github.com/ulyssesapp/x-callback-documentation

export type TextFormat = "markdown" | "text";

type Params = Record<string, string | undefined>;

export function ulyssesUrl(action: string, params: Params = {}): string {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `ulysses://x-callback-url/${action}${query ? `?${query}` : ""}`;
}

export function sheetText(title: string, body: string, format: TextFormat): string {
  const heading = title.trim();
  const text = body.trim();
  if (!heading) return text;
  const titleLine = format === "markdown" ? `# ${heading}` : heading;
  return text ? `${titleLine}\n${text}` : titleLine;
}

interface SheetOptions {
  text: string;
  group?: string;
  format?: TextFormat;
  silent?: boolean;
}

// Ulysses silently ignores a new-sheet or new-group whose group can't be found,
// so callers pass an x-error URL for Ulysses to run instead.
export function newSheetUrl(options: SheetOptions & { onError?: string }): string {
  return ulyssesUrl("new-sheet", {
    text: options.text,
    group: options.group?.trim(),
    format: options.format,
    "silent-mode": options.silent ? "YES" : undefined,
    "x-error": options.onError,
  });
}

export function newGroupUrl(options: {
  name: string;
  parent?: string;
  silent?: boolean;
  onSuccess?: string;
  onError?: string;
}): string {
  return ulyssesUrl("new-group", {
    name: options.name.trim(),
    parent: options.parent?.trim(),
    "silent-mode": options.silent ? "YES" : undefined,
    "x-success": options.onSuccess,
    "x-error": options.onError,
  });
}

// Saves to the group, or to the Inbox when the group doesn't exist.
export function saveSheetUrl(options: SheetOptions): string {
  if (!options.group?.trim()) return newSheetUrl(options);
  return newSheetUrl({ ...options, onError: newSheetUrl({ ...options, group: undefined }) });
}

// Creates the group, or creates it at the top level when the parent doesn't exist.
export function createGroupUrl(options: { name: string; parent?: string; silent?: boolean }): string {
  if (!options.parent?.trim()) return newGroupUrl(options);
  return newGroupUrl({ ...options, onError: newGroupUrl({ ...options, parent: undefined }) });
}

// "/Personal/Journal" -> parent "/Personal", name "Journal". A plain name has no parent.
export function splitGroupPath(group: string): { name: string; parent?: string } {
  const parts = group.trim().split("/").filter(Boolean);
  if (!group.trim().startsWith("/") || parts.length < 2) return { name: parts.join("/") || group.trim() };
  return { name: parts[parts.length - 1], parent: `/${parts.slice(0, -1).join("/")}` };
}

// Saves to the group, creating the group first when it doesn't exist yet.
export function journalSheetUrl(options: { text: string; group: string; silent?: boolean }): string {
  const sheet: SheetOptions = { ...options, format: "markdown" };
  const createGroup = newGroupUrl({
    ...splitGroupPath(options.group),
    silent: options.silent,
    onSuccess: newSheetUrl(sheet),
  });
  return newSheetUrl({ ...sheet, onError: createGroup });
}

// A journal sheet is titled with the date, like "Friday, October 30, 2026".
export function journalSheetText(options: { now: Date; entry?: string; locale?: string }): string {
  const title = options.now.toLocaleDateString(options.locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return sheetText(title, options.entry ?? "", "markdown");
}
