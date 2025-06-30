import emojis from "./emojis.json";

export const clearDurations: Record<string, string> = {
  "": "Don't clear",
  "30_minutes": "30 minutes",
  "3_hours": "3 hours",
  "8_hours": "8 hours",
  "1_day": "1 day",
  "3_days": "3 days",
  "7_days": "7 days",
  "30_days": "30 days",
};

const clearDurationMinutes: Record<string, number> = {
  "30_minutes": 30,
  "3_hours": 60 * 3,
  "8_hours": 60 * 8,
  "1_day": 60 * 24,
  "3_days": 60 * 24 * 3,
  "7_days": 60 * 24 * 7,
  "30_days": 60 * 24 * 30,
};

export function clearDurationText(key: string | undefined | null): string {
  if (key === undefined || key === null) {
    return "";
  }
  const r = clearDurations[key] || undefined;
  if (r === undefined) {
    return "";
  }
  return r;
}

function getClearDurationMinutes(key: string | undefined | null): number | undefined {
  if (key === undefined || key == null) {
    return undefined;
  }
  const r = clearDurationMinutes[key];
  return r;
}

export function getClearDurationDate(key: string | undefined | null): Date | undefined {
  const minutes = getClearDurationMinutes(key);
  if (minutes === undefined) {
    return undefined;
  }
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export function emojiSymbol(text: string | undefined): string {
  if (!text) {
    return "";
  }
  const es = emojis as Record<string, string>;
  const val = es[text];
  if (val === undefined) {
    return "";
  }
  return val;
}

export function getAllEmojiSymbolAliases(): string[] {
  const es = emojis as Record<string, string>;
  return Object.keys(es).map((e) => e);
}
