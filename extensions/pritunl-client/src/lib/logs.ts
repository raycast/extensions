export type LogKind = "error" | "warning" | "connected" | "disconnected" | "routes" | "dns" | "noise" | "info";

export interface LogEntry {
  id: string;
  kind: LogKind;
  /** One-line summary for the list. */
  title: string;
  /** The raw lines this entry was built from, unchanged. */
  lines: string[];
  /** Missing for lines the client printed without a timestamp, such as route changes. */
  time?: Date;
}

export interface LogSession {
  id: string;
  /** Oldest first. */
  entries: LogEntry[];
  start?: Date;
  connectedAt?: Date;
  endedAt?: Date;
}

// OpenVPN prefixes most lines with "2026-10-27 13:26:53 us=475855".
const TIMESTAMP = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?: us=\d+)? (.*)$/;
const SESSION_END = /Closing utun interface|process exiting|Exiting due to/i;
// A gap this long after the tunnel closed means the next line belongs to a new connection attempt.
const SESSION_GAP_MS = 2000;

function classify(message: string): LogKind {
  if (/Initialization Sequence Completed/i.test(message)) return "connected";
  if (SESSION_END.test(message)) return "disconnected";
  if (/^NOTE: --mute triggered|variation\(s\) on previous/i.test(message)) return "noise";
  // Notes explain defaults and can mention failures that didn't happen.
  if (/^NOTE:/i.test(message)) return "info";
  if (/\b(error|fatal|failed|AUTH_FAILED)\b/i.test(message)) return "error";
  if (/^WARNING\b/i.test(message)) return "warning";
  return "info";
}

// Lines without a timestamp come from the scripts that set up and tear down the tunnel.
function untimedKind(line: string): "routes" | "dns" | "info" {
  if (/^(add|delete) net /.test(line)) return "routes";
  if (/^dhcp-option DNS /.test(line)) return "dns";
  return "info";
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function groupTitle(kind: LogKind, lines: string[]): string {
  if (kind === "routes") {
    const added = lines.filter((line) => line.startsWith("add ")).length;
    const removed = lines.length - added;
    return [added && `Added ${plural(added, "route")}`, removed && `Removed ${plural(removed, "route")}`]
      .filter(Boolean)
      .join(", ");
  }
  if (kind === "dns") return `Set ${plural(lines.length, "DNS server")}`;
  return lines.length > 1 ? `${lines[0]} (+${lines.length - 1} more)` : lines[0];
}

function parseEntries(text: string): LogEntry[] {
  const entries: LogEntry[] = [];
  let group: { kind: LogKind; lines: string[] } | undefined;

  const flush = () => {
    if (!group) return;
    entries.push({
      id: String(entries.length),
      kind: group.kind,
      title: groupTitle(group.kind, group.lines),
      lines: group.lines,
    });
    group = undefined;
  };

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const match = TIMESTAMP.exec(line);
    if (match) {
      flush();
      const message = match[3].trim();
      entries.push({
        id: String(entries.length),
        kind: classify(message),
        title: message,
        lines: [line],
        time: new Date(`${match[1]}T${match[2]}`),
      });
      continue;
    }
    const kind = untimedKind(line);
    if (group?.kind !== kind) {
      flush();
      group = { kind, lines: [] };
    }
    group.lines.push(line);
  }
  flush();
  return entries;
}

/**
 * Splits a profile's log, which keeps growing across connections, into one session per
 * connection attempt. Logs without the usual OpenVPN markers stay a single session.
 */
export function parseLogs(text: string): LogSession[] {
  const sessions: LogSession[] = [];
  let current: LogSession | undefined;
  let lastTime: Date | undefined;

  for (const entry of parseEntries(text)) {
    const startsNew =
      !current ||
      (entry.time && current.endedAt && lastTime && entry.time.getTime() - lastTime.getTime() >= SESSION_GAP_MS);
    if (startsNew) {
      current = { id: String(sessions.length), entries: [], start: entry.time };
      sessions.push(current);
    }
    const session = current as LogSession;
    session.entries.push(entry);
    session.start ??= entry.time;
    if (entry.kind === "connected") session.connectedAt ??= entry.time;
    if (entry.kind === "disconnected") session.endedAt ??= entry.time;
    if (entry.time) lastTime = entry.time;
  }
  return sessions;
}

/** Errors, warnings and connection changes. Hides routine setup output. */
export function isImportant(entry: LogEntry): boolean {
  return ["error", "warning", "connected", "disconnected"].includes(entry.kind);
}

export function sessionText(session: LogSession): string {
  return session.entries.flatMap((entry) => entry.lines).join("\n");
}
