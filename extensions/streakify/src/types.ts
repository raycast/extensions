export interface Streak {
  id: string;
  name: string;
  emoji: string;
  checkedEmoji: string;
  uncheckedEmoji: string;
  count: number;
  lastCheckedDate: string | null; // YYYY-MM-DD
  createdAt: string; // ISO
  frozen: boolean;
  showInMenuBar: boolean; // default true
}

export const STORAGE_KEY = "streaks";

export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isCheckedToday(streak: Streak): boolean {
  return streak.lastCheckedDate === todayDateString();
}

/** True if the streak should be considered broken (missed at least one full day). */
export function isBroken(streak: Streak): boolean {
  if (streak.frozen) return false;
  if (streak.count <= 0) return false;
  if (!streak.lastCheckedDate) return true;
  const today = todayDateString();
  const yesterday = yesterdayDateString();
  return streak.lastCheckedDate !== today && streak.lastCheckedDate !== yesterday;
}

export function getDisplayEmoji(streak: Streak): string {
  if (streak.frozen) return "🧊";
  return isCheckedToday(streak) ? streak.checkedEmoji : streak.uncheckedEmoji;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Apply auto-reset + field migration.
 * Returns { streaks, changed } — persist if changed is true.
 */
export function applyStreakRules(streaks: Streak[]): { streaks: Streak[]; changed: boolean } {
  let changed = false;
  const result = streaks.map((s) => {
    const streak: Streak = {
      ...s,
      frozen: s.frozen ?? false,
      showInMenuBar: s.showInMenuBar ?? true,
    };

    if (s.frozen === undefined || s.showInMenuBar === undefined) {
      changed = true;
    }

    if (isBroken(streak)) {
      changed = true;
      return {
        ...streak,
        count: 0,
        lastCheckedDate: null,
      };
    }

    return streak;
  });
  return { streaks: result, changed };
}
