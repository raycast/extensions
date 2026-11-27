import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CHAT_DB = join(homedir(), "Library", "Messages", "chat.db");

export type IncomingMessage = {
  rowId: number;
  text: string;
};

export class MessagesPermissionError extends Error {
  constructor() {
    super("Raycast needs Full Disk Access to watch for Instinct replies.");
    this.name = "MessagesPermissionError";
  }
}

export function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function parseIncomingMessages(stdout: string): IncomingMessage[] {
  if (!stdout.trim()) return [];
  const rows = JSON.parse(stdout) as Array<{ rowid: number; text: string | null }>;
  return rows.map((row) => ({
    rowId: Number(row.rowid),
    text: row.text?.trim() || "A reply arrived, but Raycast could not decode its text. Open Messages to read it.",
  }));
}

async function query(sql: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/sqlite3", ["-readonly", "-json", CHAT_DB, sql], {
      timeout: 5_000,
      maxBuffer: 1_000_000,
    });
    return stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/authorization denied|operation not permitted|unable to open database/i.test(message)) {
      throw new MessagesPermissionError();
    }
    throw new Error(`Could not read Messages: ${message.slice(0, 160)}`);
  }
}

export async function latestIncomingRowId(address: string): Promise<number> {
  const stdout = await query(`
    SELECT COALESCE(MAX(m.ROWID), 0) AS rowid
    FROM message AS m
    JOIN handle AS h ON h.ROWID = m.handle_id
    WHERE m.is_from_me = 0
      AND lower(h.id) = lower(${sqlString(address)});
  `);
  const rows = JSON.parse(stdout || "[]") as Array<{ rowid: number }>;
  return Number(rows[0]?.rowid ?? 0);
}

export async function incomingMessagesAfter(address: string, rowId: number): Promise<IncomingMessage[]> {
  const stdout = await query(`
    SELECT m.ROWID AS rowid, m.text AS text
    FROM message AS m
    JOIN handle AS h ON h.ROWID = m.handle_id
    WHERE m.is_from_me = 0
      AND lower(h.id) = lower(${sqlString(address)})
      AND m.ROWID > ${Math.max(0, Math.floor(rowId))}
    ORDER BY m.ROWID ASC
    LIMIT 20;
  `);
  return parseIncomingMessages(stdout);
}
