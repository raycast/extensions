/** Small text helpers shared by the commands and tools. */

const SUBJECT_MAX = 80;

/** First non-empty line, whitespace-collapsed, cut to 80 characters. */
export function subjectFromText(text: string): string {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .find(Boolean);
  if (!line) return "Note to self";
  const chars = Array.from(line);
  return chars.length > SUBJECT_MAX
    ? `${chars
        .slice(0, SUBJECT_MAX - 1)
        .join("")
        .trimEnd()}…`
    : line;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FILE_NAME = /^[\w-]+\.[A-Za-z0-9]{1,5}$/;

/**
 * One short token that reads as a code or a password, not a word, file name,
 * address or URL. The clipboard is where Copy Sign-In Code and password
 * managers leave those, so nothing auto-fills or auto-sends one.
 */
export function looksLikeSecret(text: string): boolean {
  const token = text.trim();
  if (!/^\S{4,64}$/.test(token)) return false;
  if (/^https?:\/\//i.test(token) || EMAIL.test(token) || FILE_NAME.test(token)) return false;
  if (/^\d+$/.test(token)) return true;
  const letter = /\p{L}/u.test(token);
  return letter && (/\d/.test(token) || /[^\p{L}\d._@-]/u.test(token));
}

/** "a@b.c, Ada <ada@x.io>; c@d.e" → addresses. Separators inside a quoted
 *  name or angle brackets don't split ("Doe, Jane" <jane@x.io> is one).
 *  Returns the invalid parts too, so a form can say which one is wrong. */
export function parseRecipients(raw: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const part of splitMailboxes(raw)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const angle = /<([^>]+)>\s*$/.exec(trimmed);
    const email = (angle ? angle[1]! : trimmed).trim();
    if (EMAIL.test(email)) valid.push(email);
    else invalid.push(trimmed);
  }
  return { valid, invalid };
}

// fallow-ignore-next-line complexity
function splitMailboxes(raw: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  let angled = false;
  for (const ch of raw) {
    if (ch === '"' && !angled) quoted = !quoted;
    else if (ch === "<" && !quoted) angled = true;
    else if (ch === ">" && !quoted) angled = false;
    else if (/[,;\n]/.test(ch) && !quoted && !angled) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/**
 * Plain mail text as Markdown that renders as the same plain text: characters
 * Markdown would act on are escaped, and line breaks are kept. Never passes
 * HTML through — a `<` is escaped like everything else.
 */
export function plainTextToMarkdown(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/([\\`*_{}[\]()<>#+\-.!|~])/g, "\\$1"))
    .join("  \n");
}

export function displayAddress(addr: { email: string; name: string | null } | null | undefined): string {
  if (!addr) return "Unknown sender";
  return addr.name?.trim() || addr.email;
}

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  svg: "image/svg+xml",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  html: "text/html",
  json: "application/json",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  key: "application/vnd.apple.keynote",
  pages: "application/vnd.apple.pages",
  numbers: "application/vnd.apple.numbers",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  mov: "video/quicktime",
  ics: "text/calendar",
};

export function mimeTypeFor(fileName: string): string {
  const ext = /\.([A-Za-z0-9]+)$/.exec(fileName)?.[1]?.toLowerCase();
  return (ext && MIME[ext]) || "application/octet-stream";
}
