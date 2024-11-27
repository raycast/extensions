import { getPreferenceValues } from "@raycast/api";
import { Card } from "./types";
import { promises as fs } from "fs";

const preferences = getPreferenceValues<ExtensionPreferences>();

export async function getCards(): Promise<Card[]> {
  const data = await fs.readFile(preferences.dataFile, "utf-8");

  if (data.length == 0) {
    return [];
  }

  return JSON.parse(data);
}

export async function saveCards(cards: Card[]) {
  await fs.writeFile(preferences.dataFile, JSON.stringify(cards));
}
