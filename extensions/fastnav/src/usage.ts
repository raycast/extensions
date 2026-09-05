import { LocalStorage } from "@raycast/api";
import { FastNavCommand } from "./bridge";

const STORAGE_KEY = "command-usage-v1";

export interface UsageEntry {
  count: number;
  lastUsed: number;
}

export type UsageMap = Record<string, UsageEntry>;

export function usageKey(command: FastNavCommand): string {
  const source =
    command.source === "menu" ? "menu" : `interface:${command.role ?? ""}`;
  return [
    command.bundleIdentifier ?? String(command.pid),
    source,
    command.menuPath.join(" › "),
    command.title,
  ].join("|");
}

export function usageBonus(entry?: UsageEntry): number {
  if (!entry) return 0;
  const ageInDays = Math.max(0, (Date.now() - entry.lastUsed) / 86_400_000);
  const recency = Math.max(0, 35 - ageInDays);
  return Math.log2(entry.count + 1) * 24 + recency;
}

export async function loadUsage(): Promise<UsageMap> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) return {};

  try {
    return JSON.parse(stored) as UsageMap;
  } catch {
    return {};
  }
}

export async function recordUsage(
  command: FastNavCommand,
  usage: UsageMap,
): Promise<UsageMap> {
  const key = usageKey(command);
  const previous = usage[key];
  const updated = {
    ...usage,
    [key]: {
      count: (previous?.count ?? 0) + 1,
      lastUsed: Date.now(),
    },
  };
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
