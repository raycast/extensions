import { LocalStorage } from "@raycast/api";

export type LastAction = "run" | "copy" | "paste";

export interface CommandUsage {
  action: LastAction;
  values: Record<string, string>;
  usedAt: string;
}

export type UsageState = Record<string, CommandUsage>;

const PREFIX = "usage:";

function isCommandUsage(value: unknown): value is CommandUsage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const usage = value as Record<string, unknown>;
  return (
    (usage.action === "run" ||
      usage.action === "copy" ||
      usage.action === "paste") &&
    typeof usage.usedAt === "string" &&
    typeof usage.values === "object" &&
    usage.values !== null &&
    Object.values(usage.values).every((entry) => typeof entry === "string")
  );
}

export async function readUsageState(): Promise<UsageState> {
  const items = await LocalStorage.allItems();
  const state: UsageState = {};
  for (const [key, raw] of Object.entries(items)) {
    if (!key.startsWith(PREFIX) || typeof raw !== "string") {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isCommandUsage(parsed)) {
        state[key.slice(PREFIX.length)] = parsed;
      }
    } catch {
      // corrupted entry — ignore
    }
  }
  return state;
}

export async function saveUsage(
  commandId: string,
  usage: CommandUsage,
): Promise<void> {
  await LocalStorage.setItem(`${PREFIX}${commandId}`, JSON.stringify(usage));
}

export async function removeUsage(commandId: string): Promise<void> {
  await LocalStorage.removeItem(`${PREFIX}${commandId}`);
}
