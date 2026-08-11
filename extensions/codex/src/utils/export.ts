import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type CodexThread,
  type CodexThreadConversationMessage,
  readThreadConversation,
} from "./app-server";
import { getThreadDisplayTitle } from "./format";
import { cleanCodexUserMessage } from "./message-cleaning";

type ExportMessage = {
  role: "user" | "assistant";
  text: string;
  timestamp?: number;
};

export async function exportThreadToMarkdown(
  thread: CodexThread,
): Promise<string> {
  const conversation = await readThreadConversation(thread.id);
  const messages = extractMessages(conversation.messages);

  if (messages.length === 0) {
    throw new Error(
      "No user or assistant messages were found in this thread to export.",
    );
  }

  const markdown = buildMarkdown(thread, messages, conversation.turnCount);
  const outPath = buildOutputPath(thread);
  await writeFile(outPath, markdown, "utf8");
  return outPath;
}

function extractMessages(
  conversationMessages: CodexThreadConversationMessage[],
): ExportMessage[] {
  const messages: ExportMessage[] = [];

  for (const conversationMessage of conversationMessages) {
    const message: ExportMessage = {
      role: conversationMessage.role === "user" ? "user" : "assistant",
      text: conversationMessage.text,
      timestamp: conversationMessage.timestamp,
    };
    const previous = messages[messages.length - 1];

    if (previous?.role === message.role) {
      if (previous.text !== message.text) {
        previous.text = `${previous.text}\n\n${message.text}`;
      }
      continue;
    }

    messages.push(message);
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

function buildMarkdown(
  thread: CodexThread,
  messages: ExportMessage[],
  turnCount: number,
): string {
  const title = getThreadDisplayTitle(thread);

  const header = [
    `# Thread Title: ${title}`,
    ``,
    `- **Thread ID:** \`${thread.id}\``,
    `- **Working Directory:** \`${thread.cwd}\``,
    `- **Created:** ${formatHeaderTimestamp(thread.createdAt)}`,
    `- **Updated:** ${formatHeaderTimestamp(thread.updatedAt)}`,
    `- **Turns:** ${turnCount}`,
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
