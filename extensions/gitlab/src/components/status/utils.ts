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
  return clearDurations[key] || "";
}

export function getClearDurationDate(key: string | undefined | null): Date | undefined {
  if (key === undefined || key == null) {
    return undefined;
  }
  const minutes = clearDurationMinutes[key];
  if (minutes === undefined) {
    return undefined;
  }
  const clearAt = new Date();
  clearAt.setMinutes(clearAt.getMinutes() + minutes);
  return clearAt;
}

export function emojiSymbol(text: string | undefined): string {
  if (!text) {
    return "";
  }
  return (emojis as Record<string, string>)[text] || "";
}

export function getAllEmojiSymbolAliases(): string[] {
  const emojiSymbols = emojis as Record<string, string>;
  return Object.keys(emojiSymbols).map((alias) => alias);
}
