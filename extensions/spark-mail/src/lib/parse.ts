// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailRow {
  id: string;
  account: string;
  from: string;
  date: string;
  subject: string;
  flags: string;
}

export interface Account {
  email: string;
  /** "read-only" | "triage" | "send" (as reported by `spark accounts`). */
  access: string;
}

/**
 * Spark's access levels are cumulative: `triage` adds every write operation on
 * top of `read-only`, and `send` adds sending/scheduling on top of `triage`.
 * `spark help accounts` only documents the first two, but the CLI does report
 * `send`, so compare by rank instead of matching a single level.
 */
const ACCESS_RANK: Record<string, number> = {
  "read-only": 0,
  triage: 1,
  send: 2,
};

/** True when the access level allows write operations (triage and above). */
export function canWrite(access: string | undefined): boolean {
  return (ACCESS_RANK[access?.trim().toLowerCase() ?? ""] ?? -1) >= 1;
}

export interface ParsedRecord {
  headers: Record<string, string>;
  body: string;
}

export interface RecordsResult {
  /** Leading block before the first divider (search summary / thread header). */
  summary: Record<string, string>;
  records: ParsedRecord[];
}

export interface InboxView {
  title: string;
  value: string;
  /** Gmail-style filter string passed to `--filter` (empty = none). */
  filter: string;
  /** Use the `--new-senders` flag instead of a filter. */
  newSenders?: boolean;
}

export const INBOX_VIEWS: InboxView[] = [
  { title: "All Mail", value: "", filter: "" },
  { title: "Unread", value: "unread", filter: "is:unread" },
  { title: "Has Attachment", value: "attachment", filter: "has:attachment" },
  { title: "New Senders", value: "new-senders", filter: "", newSenders: true },
  { title: "Priority", value: "priority", filter: "category:priority" },
  { title: "People", value: "personal", filter: "category:personal" },
  {
    title: "Notifications",
    value: "notification",
    filter: "category:notification",
  },
  { title: "Newsletters", value: "newsletter", filter: "category:newsletter" },
  { title: "Invites", value: "invitation", filter: "category:invitation" },
];

// ─── Parsers ──────────────────────────────────────────────────────────────────

const DIVIDER = /^\s*─{5,}\s*$/;

/**
 * Parse the fixed-width table emitted by `spark emails`. Column boundaries are
 * derived from the header row's known tokens, so values containing spaces
 * (sender names, subjects) survive intact.
 */
export function parseEmailTable(stdout: string): EmailRow[] {
  const lines = stdout.split(/\r?\n/);
  const headerIdx = lines.findIndex(
    (l) => l.includes("ID") && l.includes("Subject") && l.includes("From"),
  );
  if (headerIdx === -1) return [];

  const header = lines[headerIdx];
  const cols = (
    [
      { key: "id", start: header.indexOf("ID") },
      { key: "account", start: header.indexOf("Account") },
      { key: "from", start: header.indexOf("From") },
      { key: "date", start: header.indexOf("Date") },
      { key: "subject", start: header.indexOf("Subject") },
      { key: "flags", start: header.indexOf("Flags") },
    ] as { key: keyof EmailRow; start: number }[]
  ).filter((c) => c.start !== -1);

  const rows: EmailRow[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    if (!line.trim()) break; // blank line ends the table
    if (/^\s*Page\s+\d+/.test(line)) break;
    const row: Partial<EmailRow> = {};
    for (let i = 0; i < cols.length; i++) {
      const start = cols[i].start;
      const end = i + 1 < cols.length ? cols[i + 1].start : line.length;
      row[cols[i].key] = line.slice(start, end).trim();
    }
    if (row.id && /^\d+$/.test(row.id)) {
      rows.push({
        id: row.id,
        account: row.account ?? "",
        from: row.from ?? "",
        date: row.date ?? "",
        subject: row.subject ?? "",
        flags: row.flags ?? "",
      });
    }
  }
  return rows;
}

/**
 * Parse the record format used by `spark search "<topic>"` and `spark thread`:
 * blocks separated by box-drawing dividers, each block a `Key: value` header
 * followed by a blank line and a free-text body.
 */
export function parseRecords(stdout: string): RecordsResult {
  const chunks = stdout
    .split(/\r?\n/)
    .reduce<string[][]>(
      (acc, line) => {
        if (DIVIDER.test(line)) {
          acc.push([]);
        } else {
          acc[acc.length - 1].push(line);
        }
        return acc;
      },
      [[]],
    )
    .map((c) => c.join("\n").trim())
    .filter(Boolean);

  const parseChunk = (chunk: string): ParsedRecord => {
    const lines = chunk.split(/\r?\n/);
    const headers: Record<string, string> = {};
    let i = 0;
    for (; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        i++;
        break; // blank line separates headers from body
      }
      const m = line.match(/^\s*([A-Za-z][A-Za-z ]*?):\s?(.*)$/);
      if (m) {
        headers[m[1].trim().toLowerCase()] = m[2].trim();
      } else {
        break; // not a header line — treat the rest as body
      }
    }
    const body = lines.slice(i).join("\n").trim();
    return { headers, body };
  };

  const summary = chunks.length ? parseChunk(chunks[0]).headers : {};
  // A record is any chunk that carries an `ID:` header.
  const records = chunks.map(parseChunk).filter((r) => r.headers.id);
  return { summary, records };
}

/**
 * Parse the `spark accounts` tree into the top-level email accounts. Each
 * account is a line like `Email Account: a@b.com "Alias" (Access: read-only)`.
 */
export function parseAccounts(stdout: string): Account[] {
  const accounts: Account[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/^Email Account:\s*(\S+).*?\(Access:\s*([^)]+)\)/);
    if (m) accounts.push({ email: m[1], access: m[2].trim() });
  }
  return accounts;
}

export interface Contact {
  name: string;
  email: string;
}

/** Parse the two-column `Name | Email` table from `spark contacts`. */
export function parseContacts(stdout: string): Contact[] {
  const lines = stdout.split(/\r?\n/);
  const hi = lines.findIndex((l) => l.includes("Name") && l.includes("Email"));
  if (hi === -1) return [];
  const nameStart = lines[hi].indexOf("Name");
  const emailStart = lines[hi].indexOf("Email");
  const out: Contact[] = [];
  for (const line of lines.slice(hi + 1)) {
    if (!line.trim()) continue;
    const name = line.slice(nameStart, emailStart).trim();
    const email = line.slice(emailStart).trim();
    if (email.includes("@")) out.push({ name, email });
  }
  return out;
}

export interface CalendarEvent {
  day: string;
  title: string;
  time: string;
  /** Remaining lines (calendar, location, attendees, notes) joined as text. */
  details: string;
}

const DAY_HEADER = /^\s*─+\s*(.+?)\s*─{2,}\s*$/;
const EVENT_TIME = /^\s*(\d{1,2}:\d{2}\s*[–-].*|All day|All Day)\s*$/;

/**
 * Parse the day-sectioned agenda from `spark events`. Each day is introduced by
 * a `── Weekday, Mon D, YYYY ──` header; each event is a title line followed by
 * a time-range line and then indented metadata.
 */
export function parseEvents(stdout: string): CalendarEvent[] {
  const lines = stdout.split(/\r?\n/);
  const events: CalendarEvent[] = [];
  let day = "";
  for (let i = 0; i < lines.length; i++) {
    const dm = lines[i].match(DAY_HEADER);
    if (dm && /[A-Za-z]/.test(dm[1])) {
      day = dm[1].trim();
      continue;
    }
    if (i > 0 && EVENT_TIME.test(lines[i])) {
      // The title is the nearest substantive line above the time line. Since CLI
      // v1.3.1 an `ID:` line sits between the title and the time, so skip ID
      // lines and blanks while walking back.
      let t = i - 1;
      while (t >= 0 && (/^\s*ID:/.test(lines[t]) || !lines[t].trim())) t--;
      const prev = t >= 0 ? lines[t] : "";
      const prevHeader = prev.match(DAY_HEADER);
      let title = prev.trim();
      if (!title || (prevHeader && /[A-Za-z]/.test(prevHeader[1]))) title = "";
      const time = lines[i].trim();
      const detail: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (DAY_HEADER.test(lines[j]) && /[A-Za-z]/.test(lines[j])) break;
        // Stop at the start of the next event (its title line): either directly
        // before a time line, or with a single ID line in between.
        if (
          lines[j].trim() &&
          j + 1 < lines.length &&
          (EVENT_TIME.test(lines[j + 1]) ||
            (/^\s*ID:/.test(lines[j + 1]) &&
              j + 2 < lines.length &&
              EVENT_TIME.test(lines[j + 2])))
        )
          break;
        detail.push(lines[j]);
      }
      events.push({ day, title, time, details: detail.join("\n").trim() });
      i = j - 1;
    }
  }
  return events;
}

export interface Folder {
  name: string;
  count: number;
  /** Identifier to pass to `emails`/`search` (e.g. `Inbox` or `a@b.com:Archive`). */
  id: string;
}

export interface FolderGroup {
  group: string;
  folders: Folder[];
}

/** Parse the grouped folder tree from `spark folders`. */
export function parseFolders(stdout: string): FolderGroup[] {
  const groups: FolderGroup[] = [];
  let current: FolderGroup | undefined;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (/^\s*-{3,}\s*$/.test(line)) continue;
    if (!/^\s/.test(line)) {
      current = { group: line.trim(), folders: [] };
      groups.push(current);
      continue;
    }
    const m = line.match(/^\s+(.+?)\s+(\d+)\s+messages?\s+\((.+)\)\s*$/);
    if (m && current && !/^Total/i.test(m[1])) {
      current.folders.push({
        name: m[1].trim(),
        count: Number(m[2]),
        id: m[3].trim(),
      });
    }
  }
  return groups.filter((g) => g.folders.length);
}

export interface Attachment {
  name: string;
  /** The parenthetical metadata, e.g. "Size: 405 KB, Type: inline". */
  meta: string;
  /** Local filesystem path once downloaded (via `--download-attachments`). */
  path?: string;
}

/**
 * Pull attachments out of a `thread` dump. Attachments are bulleted under an
 * `Attachments:` header as `- name (meta)`, optionally followed by a `Path:`
 * line once downloaded. Deduplicated across the per-message repeats.
 */
export function parseAttachments(stdout: string): Attachment[] {
  const lines = stdout.split(/\r?\n/);
  const seen = new Set<string>();
  const out: Attachment[] = [];
  let inAttach = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*Attachments:\s*$/.test(lines[i])) {
      inAttach = true;
      continue;
    }
    if (!inAttach) continue;
    if (!lines[i].trim() || /^\s*─{5,}/.test(lines[i])) {
      inAttach = false;
      continue;
    }
    const m = lines[i].match(/^\s*-\s+(.+?)\s*\((.*)\)\s*(?:-\s*(.*))?$/);
    if (m) {
      const pm = lines[i + 1]?.match(/^\s*Path:\s*(.+)$/);
      const path = pm ? pm[1].trim() : undefined;
      const key = path ?? m[1].trim();
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ name: m[1].trim(), meta: m[2].trim(), path });
      }
    }
  }
  return out;
}

/**
 * Clean a Spark deep link printed by `thread` so `open()` accepts it. The CLI
 * line-wraps the token: macOS emits raw whitespace, Windows emits it
 * URL-encoded (`%0D%0A`), so strip both.
 */
export function cleanLink(link?: string): string | undefined {
  if (!link) return undefined;
  return (
    link
      .replace(/\s+/g, "")
      .replace(/%0[DA]/gi, "")
      .trim() || undefined
  );
}
