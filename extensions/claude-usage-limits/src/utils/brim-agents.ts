import { HELPER_PATHS, runHelper } from "./claude-api-client";

export type AgentLimit = {
  key: string;
  label: string;
  /** Percent used, when the provider reports one. */
  utilization: number | null;
  /** The value as text, for credits, balances and other non-percent resources. */
  value: string | null;
  resetsAt: string | null;
  windowHours: number | null;
};
export type BrimAgent = { id: string; name: string; plan: string | null; stale: boolean; limits: AgentLimit[] };

type Resource = { unit?: string; used?: number; available?: number; resetsAt?: string; windowSeconds?: number };
type Account = { displayName?: string; plan?: string; stale?: boolean; resources?: Record<string, Resource> };

const labelFor = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (first) => first.toUpperCase());

const toLimit = (key: string, resource: Resource): AgentLimit | null => {
  const amount = resource.used ?? resource.available;
  if (typeof amount !== "number") return null;
  const isPercent = resource.unit === "percent";
  return {
    key,
    label: labelFor(key),
    utilization: isPercent ? amount : null,
    value: isPercent ? null : `${amount} ${resource.unit ?? ""}`.trim(),
    resetsAt: resource.resetsAt ?? null,
    windowHours: resource.windowSeconds ? resource.windowSeconds / 3600 : null,
  };
};

/** Every account Brim has a reading for. Brim's output is keyed alphabetically, not in the user's order. */
export const parseBrimAgents = (output: string): BrimAgent[] => {
  const parsed = JSON.parse(output) as { providers?: Record<string, Account> };
  return Object.entries(parsed.providers ?? {}).map(([id, account]) => ({
    id,
    name: account.displayName ?? id,
    plan: account.plan ?? null,
    stale: account.stale === true,
    limits: Object.entries(account.resources ?? {}).flatMap(([key, resource]) => toLimit(key, resource) ?? []),
  }));
};

/** The saved order first; agents not in it yet keep Brim's order at the end. */
export const applyAgentOrder = (agents: BrimAgent[], order: string[]): BrimAgent[] => {
  const rank = (agent: BrimAgent) => {
    const index = order.indexOf(agent.id);
    return index === -1 ? order.length : index;
  };
  return [...agents].sort((a, b) => rank(a) - rank(b));
};

/** The ids in their new order, after moving one agent up (-1) or down (1). */
export const moveAgent = (ids: string[], id: string, delta: -1 | 1): string[] => {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};

export const fetchBrimAgents = async (): Promise<BrimAgent[]> => {
  for (const path of HELPER_PATHS) {
    const { code, stdout } = await runHelper(path, []);
    if (code === "ENOENT") continue;
    if (code === 0) return parseBrimAgents(stdout);
    if (code === 2 || code === 4) throw new Error("Brim has no readings yet. Open Brim and add an account.");
    throw new Error(`Brim's helper failed (${code}).`);
  }
  throw new Error("Brim isn't installed. Put Brim.app in Applications.");
};
