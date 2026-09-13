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

function readQueue(key: string): PendingSend[] {
  const raw = cache.get(key);
  if (raw === undefined) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      const pending = parsePendingSend(item);
      return pending ? [pending] : [];
    });
  } catch {
    return [];
  }
}

function writeQueue(key: string, queue: PendingSend[]): void {
  if (queue.length === 0) {
    cache.remove(key);
    return;
  }

  cache.set(key, JSON.stringify(queue));
}

export function writePendingSend(args: { bot: string; prompt: string; target: PendingSend }): void {
  const key = pendingKey(args);
  const queue = readQueue(key);
  queue.push({ id: args.target.id, name: args.target.name });
  writeQueue(key, queue);
}

export function takePendingSend(args: { bot: string; prompt: string }): PendingSend | null {
  const key = pendingKey(args);
  const queue = readQueue(key);
  if (queue.length === 0) {
    return null;
  }

  const [head, ...rest] = queue;
  writeQueue(key, rest);
  return head;
}
