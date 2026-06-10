/**
 * Spark email integration for 2FA code detection
 * Uses the Spark Desktop CLI to fetch and process emails
 */

import { exec } from "child_process";
import { promisify } from "util";
import { Message, SearchType } from "./types";
import { calculateLookBackMinutes } from "./utils";
import { processGmailContent } from "./gmail";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

const execAsync = promisify(exec);

/** Ensure /usr/local/bin is in PATH so `spark` CLI can be found */
const sparkEnv = { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin` };

/**
 * Run a Spark CLI command and return stdout
 */
async function execSpark(args: string[]): Promise<string> {
  const command = `spark ${args.join(" ")}`;
  try {
    const { stdout } = await execAsync(command, { env: sparkEnv, timeout: 15000 });
    return stdout;
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    const stderr = err.stderr ?? err.message ?? "";
    if (
      stderr.includes("not set up") ||
      stderr.includes("helper") ||
      stderr.includes("not initialized") ||
      stderr.includes("command not found") ||
      stderr.includes("No such file")
    ) {
      throw new Error(
        "Spark CLI not found. Please make sure Spark Desktop is installed and CLI is enabled:\n" +
          "1. Launch Spark Desktop on your Mac\n" +
          "2. Go to Settings > AI Agents\n" +
          "3. Click Set Up CLI"
      );
    }
    throw new Error(`Spark CLI error: ${stderr || `Command failed: ${command}`}`);
  }
}

/** Column positions extracted from a table header line */
interface ColumnPositions {
  id: { start: number; end: number };
  account: { start: number; end: number };
  from: { start: number; end: number };
  date: { start: number; end: number };
  subject: { start: number; end: number };
  flags: { start: number; end: number };
}

/** Detect column start positions from the header line */
function parseTableHeader(headerLine: string): ColumnPositions | null {
  const headers = ["ID", "Account", "From", "Date", "Subject", "Flags"];
  const positions: Record<string, number> = {};

  for (const header of headers) {
    const idx = headerLine.indexOf(header);
    if (idx === -1 && header !== "Flags") return null;
    if (idx !== -1) positions[header.toLowerCase()] = idx;
  }

  const sortedKeys = Object.entries(positions).sort((a, b) => a[1] - b[1]);
  const result: Record<string, { start: number; end: number }> = {};
  for (let i = 0; i < sortedKeys.length; i++) {
    const [key, start] = sortedKeys[i];
    const end = i + 1 < sortedKeys.length ? sortedKeys[i + 1][1] : Infinity;
    result[key] = { start, end };
  }

  return result as unknown as ColumnPositions;
}

/** Extract a substring at column position, trimming whitespace */
function cellAt(line: string, pos: { start: number; end: number }): string {
  const slice = line.slice(pos.start, Math.min(pos.end, line.length));
  return slice.trim();
}

/** Parsed email row from Spark CLI */
interface SparkEmailRow {
  id: string;
  account: string;
  from: string;
  fromEmail: string;
  date: string;
  subject: string;
  isRead: boolean;
}

/** Parse table-format output from `spark emails` */
function parseEmailsTable(output: string): SparkEmailRow[] {
  const lines = output.split("\n");
  const emails: SparkEmailRow[] = [];

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("ID") && lines[i].includes("Account") && lines[i].includes("From")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const cols = parseTableHeader(lines[headerIdx]);
  if (!cols) return [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("Page")) break;

    const id = cellAt(line, cols.id);
    if (!id || !/^\d+$/.test(id)) continue;

    const account = cellAt(line, cols.account);
    const fromRaw = cellAt(line, cols.from);
    const date = cellAt(line, cols.date);
    const subject = cellAt(line, cols.subject);
    const flags = cols.flags ? cellAt(line, cols.flags) : "";

    // Parse "Name <email>" or truncated "Name <email…" format
    const fromMatch = fromRaw.match(/^(.*?)\s*<(.+?)>?…?$/);
    const from = fromMatch ? fromMatch[1].trim() : fromRaw;
    const fromEmail = fromMatch ? fromMatch[2].replace(/…$/, "") : fromRaw;

    emails.push({
      id,
      account,
      from,
      fromEmail,
      date,
      subject,
      isRead: !flags.includes("unread"),
    });
  }

  return emails;
}

/** Parsed thread message from `spark thread` */
interface ThreadMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
}

/** Parse `spark thread` output into structured messages */
function parseThreadOutput(output: string): ThreadMessage[] {
  const messages: ThreadMessage[] = [];
  const lines = output.split("\n");

  // Find separator lines (───)
  const separatorIndices = lines.map((line, i) => (line.trim().match(/^─{10,}$/) ? i : -1)).filter((i) => i !== -1);

  for (let s = 0; s < separatorIndices.length; s++) {
    const start = separatorIndices[s] + 1;
    const end = s + 1 < separatorIndices.length ? separatorIndices[s + 1] : lines.length;
    const block = lines.slice(start, end).join("\n").trim();
    if (!block) continue;

    const msg: ThreadMessage = { id: "", subject: "", from: "", to: "", date: "", body: "" };

    let bodyStart = 0;
    const blockLines = block.split("\n");
    for (let i = 0; i < blockLines.length; i++) {
      const line = blockLines[i];
      const kv = line.match(/^\s+(ID|Subject|From|To|Date|Type|Flags):\s*(.*)$/);
      if (kv) {
        const key = kv[1].toLowerCase();
        const val = kv[2].trim();
        if (key === "id") msg.id = val;
        else if (key === "subject") msg.subject = val;
        else if (key === "from") msg.from = val;
        else if (key === "to") msg.to = val;
        else if (key === "date") msg.date = val;
        bodyStart = i + 1;
      } else if (line.trim() === "" && bodyStart > 0) {
        bodyStart = i + 1;
        break;
      }
    }

    const rawBody = blockLines.slice(bodyStart).join("\n");
    msg.body = rawBody.replace(/\n\s*Attachments:\s*\n[\s\S]*$/, "").trim();
    messages.push(msg);
  }

  return messages;
}

/**
 * Fetch the email body from Spark thread by email ID
 */
async function getSparkEmailBody(emailId: string): Promise<string> {
  try {
    const output = await execSpark(["thread", emailId]);
    const messages = parseThreadOutput(output);
    // Return the body of the first (main) message
    return messages.length > 0 ? messages[0].body : "";
  } catch (error) {
    console.error(`Failed to fetch Spark thread for email ${emailId}:`, error);
    return "";
  }
}

/**
 * Fetch emails from Spark Desktop CLI and convert to Message format
 */
export async function getSparkMessages(searchType: SearchType, sinceDate?: Date): Promise<Message[]> {
  try {
    const prefs = getPreferenceValues<Preferences>();
    const lookbackMinutes = calculateLookBackMinutes(prefs.lookBackUnit, parseInt(prefs.lookBackAmount || "1", 10));

    // Fetch recent emails from Spark inbox
    const output = await execSpark(["emails", "Inbox"]);
    const emailRows = parseEmailsTable(output);

    if (emailRows.length === 0) {
      return [];
    }

    // Calculate cutoff time
    const cutoffTime = sinceDate ? sinceDate.getTime() : Date.now() - lookbackMinutes * 60 * 1000;

    // Filter by date
    const recentEmails = emailRows.filter((email) => {
      const emailTime = new Date(email.date).getTime();
      return emailTime >= cutoffTime;
    });

    if (recentEmails.length === 0) {
      return [];
    }

    // Fetch thread bodies for each email and convert to Message format
    const messages: Message[] = [];

    for (const email of recentEmails) {
      const body = await getSparkEmailBody(email.id);

      // Use processGmailContent to handle HTML stripping, link detection, etc.
      const msg = processGmailContent(
        `spark-${email.id}`,
        email.subject,
        email.fromEmail || email.from,
        new Date(email.date),
        null, // no raw HTML from Spark CLI
        body || null,
        "", // no snippet
        lookbackMinutes
      );

      if (msg) {
        messages.push(msg);
      }
    }

    return messages;
  } catch (error) {
    console.error("Failed to fetch Spark messages:", error);
    throw error;
  }
}

/**
 * Check if Spark CLI is available and configured
 */
export async function checkSparkAvailable(): Promise<boolean> {
  try {
    await execSpark(["accounts"]);
    return true;
  } catch (error) {
    console.error("Spark CLI not available:", error);
    return false;
  }
}
