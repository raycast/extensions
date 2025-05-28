import fetch from "node-fetch";
import type { Emote, SevenTVEmote, SevenTVResponse } from "../types/emote";

export async function fetchTrending(): Promise<Emote[]> {
  try {
    const response = await fetch("https://7tv.io/v3/gql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query TrendingEmotes {
            emotes(query: "", limit: 20) {
              items { id name host { url } animated }
            }
          }
        `,
      }),
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as SevenTVResponse;
    const emoteItems = data?.data?.emotes?.items;
    if (Array.isArray(emoteItems)) {
      return emoteItems.map((item: SevenTVEmote) => {
        let host = item.host?.url || "";
        if (host && !host.startsWith("http")) {
          host = `https://${host.replace(/^\/+/g, "")}`;
        }
        return {
          id: item.id,
          url: item.animated ? `${host}/3x.gif` : `${host}/3x.webp`,
          name: item.name || "Unknown Emote",
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

export async function searchEmotes(searchText: string): Promise<Emote[]> {
  if (!searchText) {
    return [];
  }
  try {
    const response = await fetch("https://7tv.io/v3/gql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query SearchEmotes($query: String!) {
            emotes(query: $query, limit: 25) {
              items {
                id
                name
                host { url }
                animated
              }
            }
          }
        `,
        variables: { query: searchText },
      }),
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as SevenTVResponse;
    const emoteItems = data?.data?.emotes?.items;
    if (!Array.isArray(emoteItems)) {
      return [];
    }
    return emoteItems.map((item: SevenTVEmote) => {
      let host = item.host?.url || "";
      if (host && !host.startsWith("http")) {
        host = `https://${host.replace(/^\/+/g, "")}`;
      }
      return {
        id: item.id,
        url: item.animated ? `${host}/3x.gif` : `${host}/3x.webp`,
        name: item.name,
      };
    });
  } catch {
    return [];
  }
}
