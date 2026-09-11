export type CodexThreadLatestMessages = {
  lastUserMessage: string | null;
  lastAgentMessage: string | null;
  lastUserMessageOrder: number | null;
  lastAgentMessageOrder: number | null;
};

export type CodexThreadTurn = {
  id: string;
  items: unknown[];
  status: string;
  error: unknown | null;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
};

export function extractLatestThreadMessages(
  turns: ReadonlyArray<{ items: unknown[] }>,
): CodexThreadLatestMessages {
  let lastUserMessage: string | null = null;
  let lastAgentMessage: string | null = null;
  let lastUserMessageOrder: number | null = null;
  let lastAgentMessageOrder: number | null = null;
  let messageOrder = 0;

  for (const turn of turns) {
    for (
      let itemIndex = turn.items.length - 1;
      itemIndex >= 0;
      itemIndex -= 1
    ) {
      const item = turn.items[itemIndex];

      if (!lastAgentMessage && isAgentMessage(item)) {
        lastAgentMessage = item.text.trim() || null;
        lastAgentMessageOrder = messageOrder;
        messageOrder += 1;
      }

      if (!lastUserMessage && isUserMessage(item)) {
        lastUserMessage = formatMessage(item.content);
        lastUserMessageOrder = messageOrder;
        messageOrder += 1;
      }

      if (lastUserMessage && lastAgentMessage) {
        return {
          lastUserMessage,
          lastAgentMessage,
          lastUserMessageOrder,
          lastAgentMessageOrder,
        };
      }
    }
  }

  return {
    lastUserMessage,
    lastAgentMessage,
    lastUserMessageOrder,
    lastAgentMessageOrder,
  };
}

export function isAgentMessage(
  item: unknown,
): item is { type: "agentMessage"; text: string } {
  return Boolean(
    item &&
    typeof item === "object" &&
    "type" in item &&
    item.type === "agentMessage" &&
    "text" in item &&
    typeof item.text === "string",
  );
}

export function isUserMessage(item: unknown): item is {
  type: "userMessage";
  content: unknown[];
} {
  return Boolean(
    item &&
    typeof item === "object" &&
    "type" in item &&
    item.type === "userMessage" &&
    "content" in item &&
    Array.isArray(item.content),
  );
}

export function formatMessage(content: unknown[]): string | null {
  const parts: string[] = [];

  for (const input of content) {
    if (!input || typeof input !== "object" || !("type" in input)) {
      continue;
    }

    switch (input.type) {
      case "text":
        if (
          "text" in input &&
          typeof input.text === "string" &&
          input.text.trim()
        ) {
          parts.push(input.text.trim());
        }
        break;
      case "image":
      case "localImage":
        parts.push("[image]");
        break;
      case "skill":
        if ("name" in input && typeof input.name === "string") {
          parts.push(`[skill: ${input.name}]`);
        }
        break;
      case "mention":
        if ("name" in input && typeof input.name === "string") {
          parts.push(`@${input.name}`);
        }
        break;
      default:
        break;
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}
