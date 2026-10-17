import type { AI } from "@raycast/api";
import { jsonSchema, tool, type ModelMessage, type ToolSet } from "ai";
import { hash } from "./go";

// OpenAI and Anthropic reject tool names longer than 64 characters, which MCP tools often exceed.
const MAX_NAME_LENGTH = 64;

export function toTools(tools: AI.ModelToolSet | undefined) {
  const shorten = new Map<string, string>();
  const restore = new Map<string, string>();
  if (!tools || Object.keys(tools).length === 0) return { tools: undefined, shorten, restore };
  const used = new Set<string>();
  // Raycast executes tools itself and sends their results on the next request.
  const toolSet: ToolSet = Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => {
      const safe = shortName(name, used);
      if (safe !== name) {
        shorten.set(name, safe);
        restore.set(safe, name);
      }
      return [
        safe,
        tool({
          description: definition.description,
          inputSchema: jsonSchema(
            (definition.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
          ),
        }),
      ];
    }),
  );
  return { tools: toolSet, shorten, restore };
}

function shortName(name: string, used: Set<string>) {
  let candidate = name;
  for (let suffix = 0; candidate.length > MAX_NAME_LENGTH || used.has(candidate); suffix++) {
    const tag = hash(`${name}#${suffix}`).toString(16).padStart(8, "0");
    candidate = `${name.slice(0, MAX_NAME_LENGTH - 9)}_${tag}`;
  }
  used.add(candidate);
  return candidate;
}

// The history replays earlier tool calls under their original names, so shorten those too.
export function shortenMessages(messages: ModelMessage[], shorten: Map<string, string>): ModelMessage[] {
  if (shorten.size === 0) return messages;
  return messages.map((message) =>
    Array.isArray(message.content)
      ? ({ ...message, content: message.content.map((part) => renamed(part, shorten)) } as ModelMessage)
      : message,
  );
}

// Tool calls stream back under the short names; Raycast needs the originals to run them.
export function restoreToolNames(part: unknown, restore: Map<string, string>): unknown {
  const restored = renamed(part, restore);
  // tool-approval-request parts nest the call under `toolCall`.
  if (typeof restored !== "object" || restored === null || !("toolCall" in restored)) return restored;
  return { ...restored, toolCall: renamed(restored.toolCall, restore) };
}

function renamed<T>(part: T, names: Map<string, string>): T {
  const name = (part as { toolName?: unknown } | null)?.toolName;
  return typeof name === "string" && names.has(name) ? { ...part, toolName: names.get(name) } : part;
}
