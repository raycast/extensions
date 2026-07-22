import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { readThread, type CodexThread } from "./app-server";
import { cleanCodexUserMessage } from "./message-cleaning";
import { formatMessage, isAgentMessage, isUserMessage } from "./messages";
import { getThreadDisplayTitle } from "./format";

type ExportMessage = {
  role: "user" | "assistant";
  text: string;
  timestamp?: number;
};

export async function exportThreadToMarkdown(
  thread: CodexThread,
): Promise<string> {
  const structuredThread = await readThread(thread.id);
  const messages = extractMessages(structuredThread);

  if (messages.length === 0) {
    throw new Error(
      "No user or assistant messages were found in this thread to export.",
    );
  }

  const markdown = buildMarkdown(structuredThread, messages);
  const outPath = buildOutputPath(structuredThread);
  await writeFile(outPath, markdown, "utf8");
  return outPath;
}

function extractMessages(thread: CodexThread): ExportMessage[] {
  const messages: ExportMessage[] = [];

  for (const turn of thread.turns) {
    if (!isStructuredTurn(turn)) continue;

    for (const item of turn.items) {
      const message = extractMessage(item, getTurnTimestamp(turn));
      if (!message) continue;

      const previous = messages[messages.length - 1];
      if (previous?.role === message.role) {
        if (previous.text !== message.text) {
          previous.text = `${previous.text}\n\n${message.text}`;
        }
        continue;
      }

      messages.push(message);
    }
  }

  return messages
    .map((message) =>
      message.role === "user"
        ? {
            ...message,
            text: cleanCodexUserMessage(message.text, "preserve").trim(),
          }
        : message,
    )
    .filter((message) => message.text.length > 0);
}

function extractMessage(
  item: unknown,
  timestamp: number | undefined,
): ExportMessage | null {
  if (isAgentMessage(item)) {
    const text = item.text.trim();
    return text ? { role: "assistant", text, timestamp } : null;
  }

  if (isUserMessage(item)) {
    const text = formatMessage(item.content);
    return text ? { role: "user", text, timestamp } : null;
  }

  return null;
}

function isStructuredTurn(turn: unknown): turn is { items: unknown[] } {
  return Boolean(
    turn &&
    typeof turn === "object" &&
    "items" in turn &&
    Array.isArray(turn.items),
  );
}

function getTurnTimestamp(turn: object): number | undefined {
  return "startedAt" in turn && typeof turn.startedAt === "number"
    ? turn.startedAt
    : undefined;
}

function buildMarkdown(thread: CodexThread, messages: ExportMessage[]): string {
  const title = getThreadDisplayTitle(thread);

  const header = [
    `# Thread Title: ${title}`,
    ``,
    `- **Thread ID:** \`${thread.id}\``,
    `- **Working Directory:** \`${thread.cwd}\``,
    `- **Created:** ${formatHeaderTimestamp(thread.createdAt)}`,
    `- **Updated:** ${formatHeaderTimestamp(thread.updatedAt)}`,
    `- **Turns:** ${thread.turns.length}`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const body = messages
    .map((message) => {
      const heading = message.role === "user" ? "## User" : "## Assistant";
      const stamp = message.timestamp
        ? `\n\n_${formatHeaderTimestamp(message.timestamp)}_`
        : "";
      return `${heading}${stamp}\n\n${message.text.trim()}\n`;
    })
    .join("\n");

  return header + body;
}

// Local month.day.year at hour:minute am/pm in local timezone.
function formatHumanTime(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  let hour = date.getHours();
  const meridiem = hour >= 12 ? "pm" : "am";
  hour = hour % 12 || 12;
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}.${day}.${year} at ${hour}:${minute} ${meridiem}`;
}

function formatHeaderTimestamp(seconds: number): string {
  return formatHumanTime(new Date(seconds * 1000));
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
