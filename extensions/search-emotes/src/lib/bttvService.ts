import fetch from 'node-fetch';
import type { Emote, BTTVEmote } from '../types/emote';

export async function fetchTrending(): Promise<Emote[]> {
  try {
    const response = await fetch('https://api.betterttv.net/3/emotes/shared/top');
    if (!response.ok) {
      return [];
    }
    const rawData = await response.json();
    if (Array.isArray(rawData)) {
      return rawData
        .slice(0, 20)
        .map((item: BTTVEmote) => ({
          id: item.emote?.id || item.id,
          url: `https://cdn.betterttv.net/emote/${item.emote?.id || item.id}/3x`,
          name: item.emote?.code || item.code || 'Unknown Emote',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  } catch {
    return [];
  }
}

export async function searchEmotes(searchText: string): Promise<Emote[]> {
  if (!searchText || searchText.length < 3) {
    return [];
  }
  try {
    const response = await fetch(
      `https://api.betterttv.net/3/emotes/shared/search?query=${encodeURIComponent(searchText)}&limit=100`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (!response.ok) {
      return [];
    }
    const rawData = await response.json();
    if (!Array.isArray(rawData)) {
      return [];
    }
    return rawData
      .map((item: BTTVEmote) => ({
        id: item.id,
        url: `https://cdn.betterttv.net/emote/${item.id}/3x`,
        name: item.code,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
