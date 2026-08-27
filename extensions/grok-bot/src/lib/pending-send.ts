import { Cache } from "@raycast/api";
import { AgentId, parseAgentId } from "./types";

const cache = new Cache({ namespace: "send-to-bot" });

export type PendingSend = {
  id: AgentId;
  name: string;
};

function pendingKey(args: { bot: string; prompt: string }): string {
  return JSON.stringify({ bot: args.bot.trim(), prompt: args.prompt.trim() });
}

function parsePendingSend(raw: unknown): PendingSend | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  if (!("id" in raw) || !("name" in raw)) {
    return null;
  }

  const id = parseAgentId(raw.id);
  if (!id.ok) {
    return null;
  }
  if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
    return null;
  }

  return { id: id.value, name: raw.name };
}

export function writePendingSend(args: { bot: string; prompt: string; target: PendingSend }): void {
  cache.set(pendingKey(args), JSON.stringify({ id: args.target.id, name: args.target.name }));
}

export function takePendingSend(args: { bot: string; prompt: string }): PendingSend | null {
  const key = pendingKey(args);
  const raw = cache.get(key);
  cache.remove(key);
  if (raw === undefined) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return parsePendingSend(parsed);
  } catch {
    return null;
  }
}
