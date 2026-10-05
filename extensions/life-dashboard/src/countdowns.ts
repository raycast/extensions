import { LocalStorage } from "@raycast/api";

const KEY = "life-dashboard-countdowns";

export interface Countdown {
  id: string;
  name: string;
  emoji: string;
  /** target date, ISO yyyy-mm-dd */
  date: string;
  createdAt: number;
}

export interface CountdownBreakdown {
  days: number;
  weeks: number;
  months: number;
  years: number;
  passed: boolean;
}

export async function getCountdowns(): Promise<Countdown[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as Countdown[];
    return list.filter((c) => c?.id && c?.name && c?.date).sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function saveCountdown(c: Omit<Countdown, "id" | "createdAt"> & { id?: string }): Promise<void> {
  const list = await getCountdowns();
  if (c.id) {
    const idx = list.findIndex((x) => x.id === c.id);
    if (idx > -1) list[idx] = { ...list[idx], name: c.name, emoji: c.emoji, date: c.date };
  } else {
    list.push({
      id: `cd-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      name: c.name,
      emoji: c.emoji,
      date: c.date,
      createdAt: Date.now(),
    });
  }
  await LocalStorage.setItem(KEY, JSON.stringify(list));
}

export async function deleteCountdown(id: string): Promise<void> {
  const list = (await getCountdowns()).filter((c) => c.id !== id);
  await LocalStorage.setItem(KEY, JSON.stringify(list));
}

/** Time to the target in days / whole weeks / whole months / whole years. */
export function breakdown(dateIso: string, now = new Date()): CountdownBreakdown {
  const target = new Date(`${dateIso}T00:00:00`);
  const ms = target.getTime() - now.getTime();
  const days = Math.ceil(ms / 86400000);
  const passed = days < 0;
  const abs = Math.abs(days);
  let months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  if (!passed && target.getDate() < now.getDate()) months -= 1;
  if (passed && target.getDate() > now.getDate()) months += 1;
  months = Math.abs(months);
  return {
    days: abs,
    weeks: Math.floor(abs / 7),
    months,
    years: Math.floor(months / 12),
    passed,
  };
}

export function breakdownLine(dateIso: string, now = new Date()): string {
  const b = breakdown(dateIso, now);
  if (b.days === 0 && !b.passed) return "today 🎉";
  const parts = [`${b.days.toLocaleString("en-US")} days`];
  if (b.weeks >= 1) parts.push(`${b.weeks.toLocaleString("en-US")} weeks`);
  if (b.months >= 1) parts.push(`${b.months} months`);
  if (b.years >= 1) parts.push(`${b.years} years`);
  return b.passed ? `${parts[0]} ago` : `in ${parts.join(" · ")}`;
}
