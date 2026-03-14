import type { Part, Session, SessionStatus, Todo } from "@opencode-ai/sdk/v2";
import type { MessageWithParts, PendingState, SessionTranscriptState } from "./types";

function formatTime(timestamp?: number): string {
  if (!timestamp) {
    return "Unknown";
  }
  return new Date(timestamp).toLocaleString();
}

function formatStatus(status?: SessionStatus): string {
  if (!status) {
    return "";
  }
  if (status.type === "retry") {
    return `Retrying (${status.attempt})`;
  }
  return status.type === "busy" ? "Busy" : "Idle";
}

export function sessionSubtitle(session: Session, status?: SessionStatus): string {
  const statusLabel = formatStatus(status);
  return [statusLabel, formatTime(session.time.updated)].filter(Boolean).join(" • ");
}

export function partToMarkdown(part: Part): string {
  switch (part.type) {
    case "text":
    case "reasoning":
      return part.text.trim();
    case "tool":
      return `\n\n_Tool ${part.tool}: ${part.state.status}_\n`;
    case "file":
      return `\n\nAttached file: \`${part.filename ?? part.url}\`\n`;
    case "step-start":
      return "\n\n_Started step_\n";
    case "step-finish":
      return `\n\n_Finished step: ${part.reason}_\n`;
    case "subtask":
      return `\n\n**Subtask:** ${part.description}\n`;
    case "patch":
      return `\n\nPatched files: ${part.files.join(", ")}\n`;
    case "agent":
      return `\n\nAgent: \`${part.name}\`\n`;
    case "retry":
      return `\n\nRetry ${part.attempt}: ${JSON.stringify(part.error)}\n`;
    case "compaction":
      return `\n\n_Compaction ${part.auto ? "auto" : "manual"}_\n`;
    case "snapshot":
      return "";
    default:
      return "";
  }
}

function extractAnswerFromJsonPayload(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const candidateKeys = ["answer", "response", "content", "message", "text", "markdown"];

    for (const key of candidateKeys) {
      const value = parsed[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function normalizeAssistantText(text: string): string {
  const trimmed = text.trim();
  return extractAnswerFromJsonPayload(trimmed) ?? trimmed;
}

export function assistantMessageMarkdown(message: MessageWithParts): string {
  if (message.info.role !== "assistant") {
    return "";
  }

  return message.parts
    .filter((part): part is Extract<Part, { type: "text" }> => part.type === "text" && !part.synthetic)
    .map((part) => normalizeAssistantText(part.text))
    .filter(Boolean)
    .join("\n\n");
}

export function messageToMarkdown(message: MessageWithParts): string {
  const role = message.info.role === "assistant" ? "Assistant" : "You";
  const body =
    message.info.role === "assistant"
      ? assistantMessageMarkdown(message)
      : message.parts.map(partToMarkdown).filter(Boolean).join("\n");
  return `## ${role}\n\n${body || "_No content yet_"}\n`;
}

function conversationMessageMarkdown(message: MessageWithParts): string {
  if (message.info.role === "user") {
    const body = message.parts
      .filter((part): part is Extract<Part, { type: "text" }> => part.type === "text")
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join("\n\n");
    return body ? [`**You**`, body].join("\n\n") : "";
  }

  const content = assistantMessageMarkdown(message);

  return ["**OpenCode**", content].filter(Boolean).join("\n\n");
}

function pendingToMarkdown(pending: PendingState): string {
  const lines: string[] = [];
  if (pending.permissions.length > 0) {
    lines.push("### Pending Permissions");
    for (const request of pending.permissions) {
      lines.push(`- \`${request.permission}\` on ${request.patterns.join(", ")}`);
    }
  }
  if (pending.questions.length > 0) {
    lines.push("### Pending Questions");
    for (const request of pending.questions) {
      const first = request.questions[0];
      lines.push(`- ${first?.header ?? "Question"}: ${first?.question ?? "Needs input"}`);
    }
  }
  return lines.join("\n");
}

function todosToMarkdown(todos: Todo[]): string {
  if (todos.length === 0) {
    return "";
  }
  const lines = ["### Todos"];
  for (const todo of todos) {
    lines.push(`- [${todo.status === "completed" ? "x" : " "}] ${todo.content} (${todo.priority})`);
  }
  return lines.join("\n");
}

export function transcriptToMarkdown(state: SessionTranscriptState, session?: Session): string {
  const sections: string[] = [];
  if (session) {
    sections.push(`# ${session.title || "Untitled Session"}`);
    sections.push(`Status: **${formatStatus(state.status)}**`);
    sections.push(`Updated: ${formatTime(session.time.updated)}`);
  }
  if (state.error) {
    sections.push(`> Error: ${state.error}`);
  }
  const blockers = pendingToMarkdown(state.pending);
  if (blockers) {
    sections.push(blockers);
  }
  const todos = todosToMarkdown(state.todos);
  if (todos) {
    sections.push(todos);
  }
  if (state.messages.length === 0) {
    sections.push("_No messages yet_");
  } else {
    sections.push(state.messages.map(messageToMarkdown).join("\n\n"));
  }
  return sections.filter(Boolean).join("\n\n");
}

export function conversationToDetailMarkdown(state: SessionTranscriptState, session?: Session): string {
  const sections: string[] = [];

  if (state.error) {
    sections.push(`> Error: ${state.error}`);
  }

  const blockers = pendingToMarkdown(state.pending);
  if (blockers) {
    sections.push(blockers);
  }

  const todos = todosToMarkdown(state.todos);
  if (todos) {
    sections.push(todos);
  }

  if (state.messages.length === 0) {
    sections.push("_No messages yet_");
  } else {
    sections.push(
      state.messages
        .map((message) => conversationMessageMarkdown(message))
        .filter(Boolean)
        .join("\n\n---\n\n"),
    );
  }

  if (session?.time.updated) {
    sections.push(`---\n_Last updated ${formatTime(session.time.updated)}_`);
  }

  return sections.filter(Boolean).join("\n\n");
}

export function previewFromMessages(messages: MessageWithParts[]): string {
  for (const message of messages) {
    const text =
      message.info.role === "assistant"
        ? assistantMessageMarkdown(message)
        : message.parts
            .filter((part): part is Extract<Part, { type: "text" }> => part.type === "text")
            .map((part) => part.text.trim())
            .join(" ")
            .trim();
    if (text) {
      return text.slice(0, 160);
    }
  }
  return "No transcript preview yet";
}
