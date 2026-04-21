import { Clipboard } from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export interface CardFace {
  name: string;
  image_uris?: ImageUris;
  mana_cost?: string;
  oracle_text?: string;
  flavor_text?: string;
}

export interface Card {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  scryfall_uri: string;
  prints_search_uri?: string;
  image_uris?: ImageUris;
  card_faces?: CardFace[];
  type_line?: string;
  mana_cost?: string;
  oracle_text?: string;
  flavor_text?: string;
  set_name?: string;
  edhrec_rank?: number;
  prices?: { usd?: string; usd_foil?: string };
}

export interface ScryfallSearchResponse {
  object: string;
  data: Card[];
  total_cards: number;
  has_more: boolean;
  next_page?: string;
}

export type SortOrder = "name" | "edhrec" | "usd";

// ─── Constants ────────────────────────────────────────────────────────────────

export const FEEDBACK_URL = "https://github.com/aayushpi/scrycast/issues";
export const SAVED_CARDS_KEY = "savedCards";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCardImageUri(card: Card, size: keyof ImageUris = "png"): string {
  if (card.image_uris?.[size]) return card.image_uris[size];
  if (card.card_faces?.[0]?.image_uris?.[size]) return card.card_faces[0].image_uris[size];
  const fallback = card.image_uris?.png ?? card.card_faces?.[0]?.image_uris?.png ?? "";
  if (fallback) {
    console.warn(`[Scrycast] ${size} unavailable for "${card.name}" (${card.id}), falling back to normal`);
  } else {
    console.error(`[Scrycast] No image URI found for card "${card.name}" (${card.id})`, card);
  }
  return fallback;
}

export function getTaggerUrl(card: Card): string {
  return `https://tagger.scryfall.com/card/${card.set}/${card.collector_number}`;
}

export function getEdhrecUrl(cardName: string): string {
  return `https://edhrec.com/cards/${cardName
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-")}`;
}

export function scryfallMultiUrl(cards: Card[]): string {
  const query = cards.map((c) => `!"${c.name}"`).join(" OR ");
  return `https://scryfall.com/search?q=${encodeURIComponent(query)}`;
}

export function sortCards(cards: Card[], order: SortOrder): Card[] {
  return [...cards].sort((a, b) => {
    if (order === "name") return a.name.localeCompare(b.name);
    if (order === "edhrec") {
      const ra = a.edhrec_rank ?? Infinity;
      const rb = b.edhrec_rank ?? Infinity;
      return ra - rb;
    }
    const pa = Math.max(parseFloat(a.prices?.usd ?? "0"), parseFloat(a.prices?.usd_foil ?? "0"));
    const pb = Math.max(parseFloat(b.prices?.usd ?? "0"), parseFloat(b.prices?.usd_foil ?? "0"));
    return pb - pa;
  });
}

export async function copyCardImage(imageUri: string): Promise<void> {
  const response = await fetch(imageUri);
  if (!response.ok) throw new Error(`Failed to fetch image (${response.status})`);
  const buffer = new Uint8Array(await response.arrayBuffer());
  const tmpPath = join(tmpdir(), `scrycast-${Date.now()}.png`);
  await writeFile(tmpPath, buffer);
  await Clipboard.copy({ file: tmpPath });
}
