import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

export type Mood = "excited" | "happy" | "content" | "neutral" | "sad" | "frustrated" | "anxious";

export interface MoodEntry {
  id: string;
  mood: Mood;
  tags: string[];
  notes: string;
  date: Date;
}

// Path to stored mood entries
export const ENTRIES_FILE = path.join(environment.supportPath, "entries.json");

// Mood value mapping for charts (higher = more positive)
export const MOOD_VALUES: Record<Mood, number> = {
  excited: 7,
  happy: 6,
  content: 5,
  neutral: 4,
  sad: 3,
  frustrated: 2,
  anxious: 1,
};

export const MOOD_EMOJIS: Record<Mood, string> = {
  excited: "🤩",
  happy: "😄",
  content: "😊",
  neutral: "😐",
  sad: "😔",
  frustrated: "😤",
  anxious: "😰",
};

export const MOODS = Object.keys(MOOD_VALUES) as Mood[];

// Load existing entries or initialize empty array
export async function loadEntries({ convertDates = true }: { convertDates?: boolean } = {}): Promise<MoodEntry[]> {
  if (fs.existsSync(ENTRIES_FILE)) {
    const data = await fs.promises.readFile(ENTRIES_FILE, "utf-8");
    let entries = JSON.parse(data) as MoodEntry[];

    // Convert string dates back to Date objects if requested
    if (convertDates) {
      entries = entries.map((entry) => ({
        ...entry,
        date: new Date(entry.date),
      }));
    }

    return entries;
  }

  return [];
}

export function saveEntries(entries: MoodEntry[]): Promise<void> {
  return fs.promises.writeFile(ENTRIES_FILE, JSON.stringify(entries, null, 2));
}

export function getMoodEmoji(mood: Mood): string {
  return MOOD_EMOJIS[mood] || "❓";
}

export function getMoodTitle(mood: Mood): string {
  return mood.slice(0, 1).toUpperCase() + mood.slice(1);
}

export function formatDate(date: Date): string {
  return date.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
}

export type Timeframe = "last-week" | "last-month" | "last-3-months" | "last-year" | "all-time";

export function filterEntriesByTimeframe(entries: MoodEntry[], timeframe: Timeframe): MoodEntry[] {
  const now = new Date();
  const filteredEntries = [...entries].filter((entry) => {
    const entryDate = new Date(entry.date);
    const diffDays = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (timeframe) {
      case "last-week":
        return diffDays <= 7;
      case "last-month":
        return diffDays <= 30;
      case "last-3-months":
        return diffDays <= 90;
      case "last-year":
        return diffDays <= 365;
      case "all-time":
        return true;
      default:
        return true;
    }
  });

  return filteredEntries;
}
