import { UnifiedContact } from "./types";

export function formatBirthday(
  birthday: string | undefined,
): string | undefined {
  if (!birthday) return undefined;

  const parts = birthday.split("-").map(Number);
  if (parts.some(isNaN)) return birthday;

  let year: number | undefined;
  let month: number;
  let day: number;

  if (parts.length === 3) {
    [year, month, day] = parts;
  } else if (parts.length === 2) {
    [month, day] = parts;
  } else {
    return birthday;
  }

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;

    if (year && year > 1) {
      const date = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    } else {
      const date = new Date(2000, month - 1, day);
      return new Intl.DateTimeFormat(locale, {
        month: "long",
        day: "numeric",
      }).format(date);
    }
  } catch {
    return birthday;
  }
}

export function isUpcomingBirthday(
  birthday: string | undefined,
  withinDays = 30,
): boolean {
  if (!birthday) return false;
  const parts = birthday.split("-").map(Number);
  if (parts.some(isNaN)) return false;

  let month: number;
  let day: number;

  if (parts.length === 3) {
    [, month, day] = parts;
  } else if (parts.length === 2) {
    [month, day] = parts;
  } else {
    return false;
  }

  const today = new Date();
  const thisYear = today.getFullYear();
  const bday = new Date(thisYear, month - 1, day);
  if (bday < today) bday.setFullYear(thisYear + 1);
  const diff = (bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= withinDays;
}

export function groupByLetter(
  contacts: UnifiedContact[],
): [string, UnifiedContact[]][] {
  const groups: Record<string, UnifiedContact[]> = {};
  for (const contact of contacts) {
    const ch = contact.displayName.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(ch) ? ch : "#";
    (groups[key] ??= []).push(contact);
  }
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });
}
