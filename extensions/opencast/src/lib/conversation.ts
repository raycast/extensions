import type { FilePart, Part, ToolPart } from "@opencode-ai/sdk/v2";
import { normalizeAssistantText } from "./format";
import type { ConversationBlock, MessageWithParts } from "./types";

function formatTime(timestamp?: number): string {
  if (!timestamp) {
    return "Unknown";
  }
  return new Date(timestamp).toLocaleString();
}

function formatDuration(start?: number, end?: number): string | undefined {
  if (!start || !end) {
    return undefined;
  }
  const duration = end - start;
  if (duration < 1000) {
    return `${duration}ms`;
  }
  return `${(duration / 1000).toFixed(1)}s`;
}

export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, "").trim())
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(text: string, max = 160): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function toolTitle(part: ToolPart): string {
  const title = "title" in part.state && typeof part.state.title === "string" ? part.state.title.trim() : "";
  return title || `Tool: ${part.tool}`;
}

function toolSubtitle(part: ToolPart): string {
  const duration =
    part.state.status === "completed"
      ? formatDuration(part.state.time.start, part.state.time.end)
      : part.state.status === "error"
        ? formatDuration(part.state.time.start, part.state.time.end)
        : undefined;
  return [part.state.status, duration].filter(Boolean).join(" • ");
}

function toolDetail(part: ToolPart): string {
  const sections = [`# ${toolTitle(part)}`, `Status: ${part.state.status}`];
  if ("time" in part.state && part.state.time.start) {
    sections.push(`Started: ${formatTime(part.state.time.start)}`);
  }
  if ("time" in part.state && "end" in part.state.time && part.state.time.end) {
    sections.push(`Finished: ${formatTime(part.state.time.end)}`);
  }
  sections.push("## Input", "```json", JSON.stringify(part.state.input ?? {}, null, 2), "```");
  if (part.state.status === "completed") {
    sections.push("## Output", "```", part.state.output || "", "```");
  }
  if (part.state.status === "error") {
    sections.push("## Error", "```", part.state.error || "", "```");
  }
  return sections.join("\n\n");
}

function fileDetail(part: FilePart): string {
  const lines = [`# ${part.filename ?? part.url}`, `URL: ${part.url}`];
  if (part.source?.type === "file") {
    lines.push(`Path: ${part.source.path}`);
  }
  if (part.source?.type === "symbol") {
    lines.push(`Symbol: ${part.source.name}`, `Path: ${part.source.path}`);
  }
  return lines.join("\n\n");
}

function assistantMarkdown(parts: Part[]): string {
  return parts
    .filter((part): part is Extract<Part, { type: "text" }> => part.type === "text" && !part.synthetic)
    .map((part) => normalizeAssistantText(part.text))
    .filter(Boolean)
    .join("\n\n");
}

function userMarkdown(message: MessageWithParts): string {
  const user = message.info.role === "user" ? message.info : undefined;
  const body = message.parts
    .filter((part): part is Extract<Part, { type: "text" }> => part.type === "text")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n");
  const model = user ? `${user.model.providerID}/${user.model.modelID}` : undefined;
  return [body, model ? `Model: ${model}` : undefined].filter(Boolean).join("\n\n");
}

export function buildConversationBlocks(messages: MessageWithParts[]): ConversationBlock[] {
  const blocks: ConversationBlock[] = [];

  for (const message of messages) {
    const timestamp =
      message.info.role === "assistant"
        ? (message.info.time.completed ?? message.info.time.created)
        : message.info.time.created;

    if (message.info.role === "user") {
      const body = plainText(userMarkdown(message));
      blocks.push({
        id: `${message.info.id}:message`,
        kind: "message",
        role: "user",
        messageID: message.info.id,
        title: "You",
        subtitle: body,
        markdown: body,
        timestamp,
      });
      continue;
    }

    const assistantBody = assistantMarkdown(message.parts);
    if (assistantBody) {
      const body = plainText(assistantBody);
      blocks.push({
        id: `${message.info.id}:message`,
        kind: "message",
        role: "assistant",
        messageID: message.info.id,
        title: "OpenCode",
        subtitle: body,
        markdown: assistantBody,
        timestamp,
      });
    }

    for (const part of message.parts) {
      switch (part.type) {
        case "reasoning": {
          const text = plainText(part.text);
          if (!text) {
            break;
          }
          blocks.push({
            id: part.id,
            kind: "reasoning-summary",
            messageID: message.info.id,
            title: truncate(text.split("\n")[0] || "Reasoning", 100),
            subtitle: truncate(text.replace(/\n+/g, " ").trim(), 220),
            detailMarkdown: part.text.trim(),
            timestamp: part.time.start,
          });
          break;
        }
        case "tool":
          blocks.push({
            id: part.id,
            kind: "tool-call",
            messageID: message.info.id,
            title: toolTitle(part),
            subtitle: toolSubtitle(part),
            status: part.state.status,
            detailMarkdown: toolDetail(part),
            timestamp: "time" in part.state ? part.state.time.start : timestamp,
          });
          break;
        case "step-start":
        case "step-finish":
          break;
        case "file":
          blocks.push({
            id: part.id,
            kind: "file",
            messageID: message.info.id,
            title: part.filename ?? "Attached file",
            subtitle: truncate(part.url, 220),
            detailMarkdown: fileDetail(part),
            timestamp,
          });
          break;
        default:
          break;
      }
    }
  }

  return blocks.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}
