import techDictionaryData from "../../assets/tech-dictionary.json";
import { TechEntry } from "../types/word";

const techEntries = techDictionaryData as TechEntry[];

export function findTechEntry(query: string): TechEntry | undefined {
  const normalizedQuery = normalize(query);
  return techEntries.find((entry) => normalize(entry.term) === normalizedQuery);
}

export function getTechEntries(): TechEntry[] {
  return techEntries;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}
