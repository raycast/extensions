import { openSync, readSync, closeSync, readFileSync, statSync } from "fs";
import type {
  ContentBlock,
  Exchange,
  SessionMessage,
  SessionSummary,
} from "./types.js";
import { projectDisplayName, decodeProjectPath } from "./formatters.js";

/** Bytes to read for summary scan (16KB covers first few messages) */
const SUMMARY_BYTES = 16 * 1024;

/**
 * Quick-scan a session JSONL file to extract summary info.
 * Reads only the first 16KB synchronously — no streams, no async.
 */
export function scanSessionSummary(
  filePath: string,
  encodedProject: string,
): SessionSummary | null {
  let firstPrompt = "";
  let sessionId = "";
  let gitBranch: string | undefined;
  let timestamp: Date | undefined;
  let userCount = 0;
  let assistantCount = 0;

  try {
    const buf = Buffer.alloc(SUMMARY_BYTES);
    const fd = openSync(filePath, "r");
    const bytesRead = readSync(fd, buf, 0, SUMMARY_BYTES, 0);
    closeSync(fd);

    const text = buf.toString("utf-8", 0, bytesRead);
    // Only use complete lines (last line might be truncated)
    const lastNewline = text.lastIndexOf("\n");
    const safeText = lastNewline > 0 ? text.slice(0, lastNewline) : text;
    const lines = safeText.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      try {
        const msg: SessionMessage = JSON.parse(line);

        if (!sessionId && msg.sessionId) sessionId = msg.sessionId;
        if (!gitBranch && msg.gitBranch) gitBranch = msg.gitBranch;
        if (!timestamp && msg.timestamp) timestamp = new Date(msg.timestamp);

        if (msg.type === "user") {
          userCount++;
          if (!firstPrompt) {
            firstPrompt = extractText(msg.message?.content);
          }
        } else if (msg.type === "assistant") {
          assistantCount++;
        }
      } catch {
        // Skip malformed lines
      }
    }

    if (!sessionId || !firstPrompt) return null;

    const messageCount = estimateMessageCount(
      filePath,
      lines.length,
      userCount + assistantCount,
    );
    const decodedPath = decodeProjectPath(encodedProject);

    return {
      sessionId,
      projectPath: decodedPath,
      projectDisplayName: projectDisplayName(decodedPath),
      filePath,
      firstPrompt,
      timestamp: timestamp ?? new Date(0),
      gitBranch,
      messageCount,
    };
  } catch {
    return null;
  }
}

/**
 * Parse session exchanges from a JSONL file.
 * Reads the full file but caps output at maxExchanges.
 * For the detail preview (4 exchanges) this reads just enough.
 */
export async function parseSessionExchanges(
  filePath: string,
  maxExchanges: number,
): Promise<Exchange[]> {
  const exchanges: Exchange[] = [];

  try {
    // For preview (small maxExchanges), read limited bytes
    // For full view, read the whole file
    const content =
      maxExchanges <= 6
        ? readHead(filePath, 64 * 1024) // 64KB for preview
        : readFileSync(filePath, "utf-8");

    for (const line of content.split("\n")) {
      if (exchanges.length >= maxExchanges) break;
      if (!line.trim()) continue;

      try {
        const msg: SessionMessage = JSON.parse(line);

        if (msg.type === "user") {
          const text = extractText(msg.message?.content);
          if (text) {
            exchanges.push({
              role: "user",
              text,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
            });
          }
        } else if (msg.type === "assistant") {
          const msgContent = msg.message?.content;
          if (!msgContent) continue;

          const text = extractText(msgContent);
          const toolNames = extractToolNames(msgContent);

          if (text) {
            exchanges.push({
              role: "assistant",
              text,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
              toolNames: toolNames.length > 0 ? toolNames : undefined,
              model: msg.message?.model,
              tokenUsage: msg.message?.usage
                ? {
                    input:
                      (msg.message.usage.input_tokens ?? 0) +
                      (msg.message.usage.cache_read_input_tokens ?? 0),
                    output: msg.message.usage.output_tokens ?? 0,
                  }
                : undefined,
            });
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File may not exist
  }

  return exchanges;
}

/**
 * Read the first N bytes of a file, returning complete lines only.
 */
function readHead(filePath: string, bytes: number): string {
  try {
    const buf = Buffer.alloc(bytes);
    const fd = openSync(filePath, "r");
    const bytesRead = readSync(fd, buf, 0, bytes, 0);
    closeSync(fd);
    const text = buf.toString("utf-8", 0, bytesRead);
    const lastNewline = text.lastIndexOf("\n");
    return lastNewline > 0 ? text.slice(0, lastNewline) : text;
  } catch {
    return "";
  }
}

function extractText(content: string | ContentBlock[] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content.trim();

  const textParts: string[] = [];
  for (const block of content) {
    if (block.type === "text" && block.text) {
      textParts.push(block.text);
    }
  }
  return textParts.join("\n").trim();
}

function extractToolNames(
  content: string | ContentBlock[] | undefined,
): string[] {
  if (!content || typeof content === "string") return [];
  const names: string[] = [];
  for (const block of content) {
    if (block.type === "tool_use" && block.name) {
      names.push(block.name);
    }
  }
  return names;
}

function estimateMessageCount(
  filePath: string,
  linesRead: number,
  messagesInSample: number,
): number {
  if (linesRead === 0) return 0;
  try {
    const fileSize = statSync(filePath).size;
    const avgBytesPerLine = Math.max(fileSize / Math.max(linesRead, 1), 200);
    const estimatedTotalLines = Math.floor(fileSize / avgBytesPerLine);
    const messageRatio = linesRead > 0 ? messagesInSample / linesRead : 0.3;
    return Math.max(
      messagesInSample,
      Math.floor(estimatedTotalLines * messageRatio),
    );
  } catch {
    return messagesInSample;
  }
}
