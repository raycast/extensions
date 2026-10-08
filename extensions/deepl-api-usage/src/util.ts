import fetch from "node-fetch";
import { Usage } from "./types";
import { LocalStorage } from "@raycast/api";
import { Record } from "./types";

export function getUsagePercentage(usage: Usage): string {
  const percentage = (usage.usedCharacters / usage.totalCharacters) * 100;
  return percentage.toFixed(2);
}

export async function fetchUsage(apiKey: string): Promise<Usage> {
  const response = await fetch(`https://api-free.deepl.com/v2/usage`, {
    headers: { Authorization: `DeepL-Auth-Key ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch usage");
  }

  const data = (await response.json()) as { character_count: number; character_limit: number };
  if (data?.character_count === undefined || data?.character_limit === undefined) {
    throw new Error("Invalid API Key");
  }
  return {
    usedCharacters: data.character_count,
    totalCharacters: data.character_limit,
  };
}

export async function getRecordsFromStorage(): Promise<Record[]> {
  const storedRecords = await LocalStorage.getItem<string>("records");
  if (storedRecords) {
    return JSON.parse(storedRecords) as Record[];
  }
  return [];
}
