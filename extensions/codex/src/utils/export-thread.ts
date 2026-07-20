import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CodexThread } from "./codex-app-server";
import { cleanCodexUserMessage } from "./codex-message-cleaning";
import { getThreadDisplayTitle } from "./format";

type Turn = { role: "user" | "assistant"; text: string; timestamp?: string };

type ContentPart = { type?: string; text?: string };

type ResponseItemPayload = {
  type?: string;
  role?: string;
  content?: ContentPart[] | string;
};

type RolloutEvent = {
  timestamp?: string;
  type?: string;
  payload?: ResponseItemPayload;
};

export async function exportThreadToMarkdown(
  thread: CodexThread,
): Promise<string> {
  if (!thread.path) {
    throw new Error("This thread has no rollout file on disk yet.");
  }

  const raw = await readFile(thread.path, "utf8");
  const turns = parseTurns(raw);

  if (turns.length === 0) {
    throw new Error("No user or assistant messages found in the rollout.");
  }

  const markdown = buildMarkdown(thread, turns);
  const outPath = buildOutputPath(thread);
  await writeFile(outPath, markdown, "utf8");
  return outPath;
}

function parseTurns(jsonl: string): Turn[] {
  const turns: Turn[] = [];

  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let event: RolloutEvent;
    try {
      event = JSON.parse(trimmed) as RolloutEvent;
    } catch {
      continue;
    }

    if (event.type !== "response_item") continue;
    const payload = event.payload;
    if (!payload || payload.type !== "message") continue;
    if (payload.role !== "user" && payload.role !== "assistant") continue;

    const text = extractContentText(payload.content).trim();
    if (!text) continue;

    const last = turns[turns.length - 1];
    if (last && last.role === payload.role) {
      if (last.text === text) continue;
      // Merge consecutive same-role messages into one block: covers streaming assistant
      // progress and Codex-appended `<skill>` definitions arriving as separate user turns.
      last.text = `${last.text}\n\n${text}`;
      continue;
    }

    turns.push({ role: payload.role, text, timestamp: event.timestamp });
  }

  // Clean user messages AFTER merging so the `<skill>` relocation and
  // `$name` mention live in the same string at cleanup time.
  return turns
    .map((turn) =>
      turn.role === "user"
        ? { ...turn, text: cleanCodexUserMessage(turn.text, "preserve").trim() }
        : turn,
    )
    .filter((turn) => turn.text.length > 0);
}

function extractContentText(content: ResponseItemPayload["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) =>
      part && typeof part === "object" && typeof part.text === "string"
        ? part.text
        : "",
    )
    .filter(Boolean)
    .join("\n");
}

function buildMarkdown(thread: CodexThread, turns: Turn[]): string {
  const title = getThreadDisplayTitle(thread);

  const header = [
    `# Thread Title: ${title}`,
    ``,
    `- **Thread ID:** \`${thread.id}\``,
    `- **Working Directory:** \`${thread.cwd}\``,
    `- **Created:** ${formatHeaderTimestamp(thread.createdAt)}`,
    `- **Updated:** ${formatHeaderTimestamp(thread.updatedAt)}`,
    `- **Turns:** ${turns.length}`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const body = turns
    .map((turn) => {
      const heading = turn.role === "user" ? "## User" : "## Assistant";
      const stamp = turn.timestamp
        ? `\n\n_${formatTurnTimestamp(turn.timestamp)}_`
        : "";
      return `${heading}${stamp}\n\n${turn.text.trim()}\n`;
    })
    .join("\n");

  return header + body;
}

// Local MM.DD.YY at H:MM am/pm in local timezone; used in thread export headers and turn timestamps.
function formatHumanTime(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const DD = String(date.getDate()).padStart(2, "0");
  const YY = String(date.getFullYear()).slice(-2);
  let hour = date.getHours();
  const ampm = hour >= 12 ? "pm" : "am";
  hour = hour % 12 || 12;
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${MM}.${DD}.${YY} at ${hour}:${mm} ${ampm}`;
}

function formatHeaderTimestamp(seconds: number): string {
  return formatHumanTime(new Date(seconds * 1000));
}

function formatTurnTimestamp(iso: string): string {
  return formatHumanTime(new Date(iso));
}

function buildOutputPath(thread: CodexThread): string {
  const safeId = thread.id.replace(/[^a-zA-Z0-9-]/g, "");
  const timestamp = new Date()
    .toISOString()
    .split(".")[0]
    .replace(/[:.]/g, "-")
    .replace("T", "_");
  const filename = `codex-thread-${safeId}-${timestamp}.md`;
  return join(homedir(), "Downloads", filename);
}
