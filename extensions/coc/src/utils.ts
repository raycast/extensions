import { showToast, Toast } from "@raycast/api";
import { Account, Timer } from "./storage"; // Import types from storage.ts

export function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function getMinRemaining(timers: Timer[]): number {
  const rems = timers
    .map((t) => (t.endTimestamp ? Math.max(0, t.endTimestamp - Date.now()) : Infinity))
    .filter((r) => r > 0);
  return rems.length ? Math.min(...rems) : Infinity;
}

export function getClosestTimer(timers: Timer[]): string | null {
  let closest = { name: "", remaining: Infinity };
  timers.forEach((t) => {
    if (t.endTimestamp) {
      const rem = Math.max(0, t.endTimestamp - Date.now());
      if (rem > 0 && rem < closest.remaining) closest = { name: t.name, remaining: rem };
    }
  });
  return closest.remaining === Infinity ? null : `${closest.name}: ${formatTime(closest.remaining)}`;
}

export function getAvailability(timers: Timer[]): { available: number; total: number } {
  const total = timers.length;
  const available = timers.filter((t) => !t.endTimestamp || t.endTimestamp <= Date.now()).length;
  return { available, total };
}

export function checkCompletions(accounts: Account[]): Account[] {
  const now = Date.now();
  return accounts.map((acc) => ({
    ...acc,
    timers: acc.timers.map((t) => {
      if (t.endTimestamp && t.endTimestamp <= now) {
        showToast({ style: Toast.Style.Success, title: `Timer '${t.name}' completed! 🎉` });
        return { ...t, endTimestamp: undefined };
      }
      return t;
    }),
  }));
}
