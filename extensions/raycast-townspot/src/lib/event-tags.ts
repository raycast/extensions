const normalizeTag = (value: string): string =>
  String(value || "").trim().toLowerCase();

const FREQUENCY_TAGS: Record<string, string> = {
  "one-off": "One-Off",
  "one off": "One-Off",
  weekly: "Weekly",
  daily: "Daily",
  monthly: "Monthly",
  fortnightly: "Fortnightly",
  biweekly: "Biweekly",
  weekdays: "Weekdays",
  weekends: "Weekends",
};

const FREE_TAGS = new Set(["free", "gratis", "no cost"]);
const PAID_TAGS = new Set(["paid", "ticketed"]);

const dedupeOrdered = (values: string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const raw = String(value || "").trim();
    const normalized = normalizeTag(raw);
    if (!raw || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(raw);
  }
  return output;
};

export type EventTagParts = {
  categories: string[];
  frequency: string | null;
  price: string | null;
};

export const splitEventTags = (tags: string[]): EventTagParts => {
  let frequency: string | null = null;
  let price: string | null = null;
  const categories: string[] = [];

  for (const tag of tags || []) {
    const raw = String(tag || "").trim();
    if (!raw) continue;
    const normalized = normalizeTag(raw);

    if (!frequency && FREQUENCY_TAGS[normalized]) {
      frequency = FREQUENCY_TAGS[normalized];
      continue;
    }

    if (!price && FREE_TAGS.has(normalized)) {
      price = "Free";
      continue;
    }

    if (!price && PAID_TAGS.has(normalized)) {
      price = "Paid";
      continue;
    }

    categories.push(raw);
  }

  return {
    categories: dedupeOrdered(categories),
    frequency,
    price,
  };
};
