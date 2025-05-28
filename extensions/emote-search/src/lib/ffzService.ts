import fetch from "node-fetch";
import type { Emote, FFZEmote, FFZSearchResponse } from "../types/emote";

export interface FFZSet {
  id: number;
  _type: number;
  title: string;
  emoticons: FFZEmote[];
}

export async function fetchTrending(): Promise<Emote[]> {
  try {
    const response = await fetch(
      "https://api.frankerfacez.com/v1/emoticons?sort=count-desc&per_page=20"
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as FFZSearchResponse;
    if (!data.emoticons) {
      return [];
    }

    return data.emoticons
      .filter((emote) => !emote.hidden && !emote.modifier)
      .map((emote) => ({
        id: String(emote.id),
        url: getFFZEmoteImageUrl(emote),
        name: emote.name,
      }));
  } catch {
    return [];
  }
}

export async function searchEmotes(searchText: string): Promise<Emote[]> {
  if (!searchText) return [];

  try {
    const response = await fetch(
      `https://api.frankerfacez.com/v1/emoticons?q=${encodeURIComponent(searchText)}&sort=count-desc&per_page=20`
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as FFZSearchResponse;
    if (!data.emoticons) {
      return [];
    }

    return data.emoticons
      .filter((emote) => !emote.hidden && !emote.modifier)
      .map((emote) => ({
        id: String(emote.id),
        url: getFFZEmoteImageUrl(emote),
        name: emote.name,
      }));
  } catch {
    return [];
  }
}

export function getFFZEmoteImageUrl(emote: FFZEmote): string {
  // Use the highest available resolution (prefer 4, then 2, then 1)
  const url = emote.urls["4"] || emote.urls["2"] || emote.urls["1"];
  // URLs are already full URLs with https:// prefix
  return url || "";
}

export function getFFZEmoteFileExtension(): string {
  // FFZ emotes are always PNG, even if animated (they use APNG)
  return "png";
}
