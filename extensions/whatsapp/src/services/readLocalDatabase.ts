import { execFile } from "child_process";
import { promisify } from "util";
import { homedir, platform } from "os";
import { existsSync } from "fs";
import { join } from "path";
import { phone as parsePhone } from "phone";

const execFileAsync = promisify(execFile);

export interface DatabaseChat {
  name: string;
  /** E.164 phone number (e.g. "+15551234567") */
  phone: string;
  /** Apple Core Data timestamp in ms since epoch, or null. */
  lastMessageAt: number | null;
}

export function getDatabasePath(): string | null {
  if (platform() === "darwin") {
    return join(homedir(), "Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite");
  }
  return null;
}

export function isDatabaseAvailable(): boolean {
  const path = getDatabasePath();
  return path !== null && existsSync(path);
}

/**
 * Read individual (non-group, non-LID) chats from the local WhatsApp database.
 * Groups are skipped because the DB stores their internal JID, not the invite
 * code that the `whatsapp://chat?code=...` deep link requires.
 * @lid chats are skipped because they're WhatsApp's pseudo-IDs for hidden
 * numbers, not real phone numbers we can dial.
 */
export async function readDatabaseChats(): Promise<DatabaseChat[]> {
  const dbPath = getDatabasePath();
  if (!dbPath || !existsSync(dbPath)) {
    throw new Error("WhatsApp database not found. This command only works on macOS with WhatsApp installed.");
  }

  const query = `
    SELECT
      ZPARTNERNAME as name,
      ZCONTACTJID as jid,
      ZLASTMESSAGEDATE as last_msg
    FROM ZWACHATSESSION
    WHERE ZPARTNERNAME IS NOT NULL
      AND ZSESSIONTYPE = 0
      AND ZCONTACTJID LIKE '%@s.whatsapp.net'
    ORDER BY ZLASTMESSAGEDATE DESC
  `.trim();

  const { stdout } = await execFileAsync("/usr/bin/sqlite3", ["-readonly", "-json", dbPath, query], {
    maxBuffer: 32 * 1024 * 1024,
  });

  if (!stdout.trim()) return [];

  const rows = JSON.parse(stdout) as Array<{ name: string; jid: string; last_msg: number | null }>;

  const chats: DatabaseChat[] = [];
  for (const row of rows) {
    const digits = row.jid.split("@")[0];
    if (!digits || !/^\d+$/.test(digits)) continue;
    const parsed = parsePhone("+" + digits);
    if (!parsed.isValid) continue;
    // Core Data timestamps are seconds since 2001-01-01 UTC.
    const lastMessageAt = row.last_msg != null ? Math.round((row.last_msg + 978307200) * 1000) : null;
    chats.push({ name: row.name, phone: parsed.phoneNumber, lastMessageAt });
  }
  return chats;
}
