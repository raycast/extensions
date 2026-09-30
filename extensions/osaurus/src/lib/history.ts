import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Osaurus's own store; its schema is undocumented, so read only the columns we need.
const DB_PATH = join(homedir(), ".osaurus", "chat-history", "history.sqlite");

// ponytail: shells out to the system sqlite3 (always present on macOS) instead of bundling a driver.
async function query<T>(sql: string): Promise<T[]> {
  // No file yet means Osaurus has never saved a chat.
  if (!existsSync(DB_PATH)) return [];
  // .timeout waits out a write lock held by Osaurus instead of failing immediately.
  const args = ["-readonly", "-json", "-cmd", ".timeout 2000", DB_PATH, sql];
  const { stdout } = await execFileAsync("/usr/bin/sqlite3", args, {
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout.trim() ? (JSON.parse(stdout) as T[]) : [];
}

// Single-quoted SQL literal, with LIKE wildcards escaped so they match literally.
function likeLiteral(text: string): string {
  const escaped = text.replace(/[\\%_]/g, "\\$&").replace(/'/g, "''");
  return `'%${escaped}%'`;
}

export interface Session {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  selected_model: string | null;
  source: string;
  turn_count: number;
  pinned: number;
}

export async function searchSessions(text: string): Promise<Session[]> {
  const q = text.trim();
  const where = q
    ? `AND (s.title LIKE ${likeLiteral(q)} ESCAPE '\\' OR EXISTS (
         SELECT 1 FROM turns t WHERE t.session_id = s.id AND t.content LIKE ${likeLiteral(q)} ESCAPE '\\'))`
    : "";
  // archived and pinned arrived in a later Osaurus schema; an older database may not have them.
  const columns = new Set(
    (await query<{ name: string }>("SELECT name FROM pragma_table_info('sessions')")).map((c) => c.name),
  );
  const pinned = columns.has("pinned") ? "s.pinned" : "0";
  const notArchived = columns.has("archived") ? "s.archived = 0" : "1";
  return query<Session>(
    `SELECT s.id, s.title, s.created_at, s.updated_at, s.selected_model, s.source, s.turn_count, ${pinned} AS pinned
     FROM sessions s WHERE ${notArchived} ${where}
     ORDER BY ${pinned} DESC, s.updated_at DESC LIMIT 200`,
  );
}

export interface Turn {
  role: string;
  content: string | null;
}

export async function getTurns(sessionId: string): Promise<Turn[]> {
  const id = sessionId.replace(/'/g, "''");
  return query(`SELECT role, content FROM turns WHERE session_id = '${id}' ORDER BY seq`);
}

// The same Markdown as Osaurus's own Export Conversation (ChatSessionExporter.markdown), minus
// the attachments, tool calls, and capabilities lines, which chats from Raycast don't have.
export function exportMarkdown(s: Session, turns: Turn[]): string {
  // Apple's medium date + short time: "Sep 26, 2026 at 10:42 PM".
  // ponytail: "at" is English; Apple localizes it, add Intl parts if non-English exports matter.
  const date = (t: number) => {
    const d = new Date(t * 1000);
    return `${d.toLocaleDateString(undefined, { dateStyle: "medium" })} at ${d.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
  };
  const meta = [
    `Created: ${date(s.created_at)}`,
    `Updated: ${date(s.updated_at)}`,
    ...(s.selected_model ? [`Model: ${s.selected_model}`] : []),
    `Source: ${s.source}`,
  ];
  const role = (r: string) => r[0].toUpperCase() + r.slice(1);
  return (
    [
      `# ${s.title}`,
      `> ${meta.join(" · ")}`,
      ...turns.flatMap((t, i) => [
        `## ${role(t.role)} — turn ${i + 1}`,
        ...(t.content?.trim() ? [t.content.trim()] : []),
      ]),
    ].join("\n\n") + "\n"
  );
}

// "2026-09-26 do you prefer super artificial intelligence": the chat's start date sorts the files,
// then the title's first words, with anything a filesystem or shell treats specially dropped.
export function exportName(s: Session): string {
  const d = new Date(s.created_at * 1000);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const words = s.title
    .replace(/[^\p{L}\p{N} _'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Past 50 characters, stop at the last whole word.
  const short = words.length > 50 ? words.slice(0, 51).replace(/\s*\S*$/, "") || words.slice(0, 50) : words;
  return `${day} ${short || "chat"}`;
}
