import { LocalStorage } from "@raycast/api";
import type { Stats } from "node:fs";

// Order commands (--dc/--dm/--big/--small). A registry, not a switch: the logic
// (value/format/matchesArg) lives in code, keyed by a stable `id`. The trigger `code`
// and the enabled flag are user-editable in Manage Tools and persisted as overrides.
export interface OrderCommand {
  id: string;
  label: string;
  defaultCode: string;
  value: (s: Stats) => number;
  format: (s: Stats) => string;
  dateOf?: (s: Stats) => Date; // present for date tools => enables date-arg filtering
}

export interface ResolvedTool extends OrderCommand {
  code: string;
  enabled: boolean;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${i > 0 && n < 10 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

export const ORDER_COMMANDS: OrderCommand[] = [
  {
    id: "created",
    label: "Created",
    defaultCode: "dc",
    value: (s) => s.birthtimeMs,
    format: (s) => formatDate(s.birthtime),
    dateOf: (s) => s.birthtime,
  },
  {
    id: "modified",
    label: "Modified",
    defaultCode: "dm",
    value: (s) => s.mtimeMs,
    format: (s) => formatDate(s.mtime),
    dateOf: (s) => s.mtime,
  },
  {
    id: "largest",
    label: "Largest",
    defaultCode: "big",
    value: (s) => s.size,
    format: (s) => formatSize(s.size),
  },
  {
    // Smallest first: negate the size so the shared descending sort yields ascending.
    id: "smallest",
    label: "Smallest",
    defaultCode: "small",
    value: (s) => -s.size,
    format: (s) => formatSize(s.size),
  },
];

interface ToolOverride {
  id: string;
  code: string;
  enabled: boolean;
}

const TOOLS_KEY = "orderTools";

// Merge the built-in commands with the user's stored code/enabled overrides.
export async function getOrderTools(): Promise<ResolvedTool[]> {
  const raw = await LocalStorage.getItem<string>(TOOLS_KEY);
  let overrides: ToolOverride[] = [];
  if (raw) {
    try {
      overrides = JSON.parse(raw) as ToolOverride[];
    } catch {
      overrides = [];
    }
  }
  return ORDER_COMMANDS.map((c) => {
    const o = overrides.find((x) => x.id === c.id);
    return { ...c, code: o?.code ?? c.defaultCode, enabled: o?.enabled ?? true };
  });
}

export async function saveOrderTools(tools: ResolvedTool[]): Promise<void> {
  const overrides: ToolOverride[] = tools.map((t) => ({ id: t.id, code: t.code, enabled: t.enabled }));
  await LocalStorage.setItem(TOOLS_KEY, JSON.stringify(overrides));
}

export async function resetOrderTools(): Promise<void> {
  await LocalStorage.removeItem(TOOLS_KEY);
}

// Resolve a typed --cmd name against the enabled tools' (possibly customized) codes.
export function resolveCommand(name: string, tools: ResolvedTool[]): ResolvedTool | undefined {
  return tools.find((t) => t.enabled && t.code === name);
}
