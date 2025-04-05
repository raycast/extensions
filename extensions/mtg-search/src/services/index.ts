import type { MtgCard, ScryfallResponse } from "../types";
import { mapCard } from "../utils";

const API_URL = "https://api.scryfall.com/cards/search";

export const fetchCards = async (name: string): Promise<MtgCard[]> => {
  const url = new URL(API_URL);
  url.searchParams.set("q", name);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }

    const { data = [] } = (await response.json()) as ScryfallResponse;

    return data.map(mapCard).sort((a, b) => a.fullName.localeCompare(b.fullName));
  } catch (error) {
    console.error("Error fetching cards:", error);
    return [];
  }
};
