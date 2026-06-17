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
export const SCRYFALL_API_BASE = "https://api.scryfall.com";
export const TAGGER_BASE_URL = "https://tagger.scryfall.com";
export const TAGGER_BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// True DFCs have image_uris on each face; same-face layouts (Adventure, Prepared,
// Split, etc.) have a single top-level image and no per-face image_uris.
export function isFlippable(card: Card): boolean {
  return card.card_faces != null && card.card_faces.length >= 2 && card.card_faces[1].image_uris != null;
}

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

// ─── Tagger API ───────────────────────────────────────────────────────────────

export interface Tagging {
  tag: {
    name: string;
    type: "ORACLE_CARD_TAG" | "ILLUSTRATION_TAG" | string;
  };
}

interface TaggerResponse {
  data?: { card?: { taggings: Tagging[] } };
  errors?: Array<{ message: string }>;
}

export async function fetchCardTags(set: string, collectorNumber: string): Promise<Tagging[]> {
  const cardUrl = `${TAGGER_BASE_URL}/card/${set}/${collectorNumber}`;

  console.log(`[Scrycast] Fetching tagger page for ${set}/${collectorNumber}`);
  const pageResponse = await fetch(cardUrl, {
    headers: {
      "User-Agent": TAGGER_BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!pageResponse.ok) {
    console.error(`[Scrycast] Tagger page returned ${pageResponse.status} for ${cardUrl}`);
    throw new Error(`Tagger page unavailable (${pageResponse.status})`);
  }

  const html = await pageResponse.text();
  const csrfMatch = html.match(/name="csrf-token" content="([^"]+)"/);
  if (!csrfMatch) {
    console.error("[Scrycast] CSRF token not found. Page excerpt:", html.slice(0, 500));
    throw new Error("Could not find CSRF token on tagger page");
  }

  const csrfToken = csrfMatch[1];
  const setCookies: string[] =
    typeof (pageResponse.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (pageResponse.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [pageResponse.headers.get("set-cookie") ?? ""];

  const cookieHeader = setCookies
    .filter(Boolean)
    .map((c) => c.split(";")[0])
    .join("; ");

  console.log(`[Scrycast] CSRF acquired (${csrfToken.slice(0, 12)}…), cookies: ${cookieHeader.slice(0, 60)}…`);

  const gqlResponse = await fetch(`${TAGGER_BASE_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      Cookie: cookieHeader,
      Origin: TAGGER_BASE_URL,
      Referer: cardUrl,
    },
    body: JSON.stringify({
      query: `query {
        card: cardBySet(set: ${JSON.stringify(set)}, number: ${JSON.stringify(collectorNumber)}) {
          taggings { tag { name type } }
        }
      }`,
    }),
  });

  if (!gqlResponse.ok) {
    const body = await gqlResponse.text();
    console.error(`[Scrycast] GraphQL ${gqlResponse.status}:`, body);
    throw new Error(`GraphQL request failed (${gqlResponse.status})`);
  }

  const result = (await gqlResponse.json()) as TaggerResponse;

  if (result.errors?.length) {
    console.error("[Scrycast] GraphQL errors:", JSON.stringify(result.errors, null, 2));
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const taggings: Tagging[] = result.data?.card?.taggings ?? [];
  console.log(`[Scrycast] ${taggings.length} tags returned for ${set}/${collectorNumber}`);
  return taggings;
}

export function tagSearchQuery(type: string, name: string): string {
  if (type === "ORACLE_CARD_TAG") return `oracletag:"${name}"`;
  if (type === "ILLUSTRATION_TAG") return `arttag:"${name}"`;
  return `"${name}"`;
}

export function tagScryfallSearchUrl(type: string, name: string): string {
  if (type === "ORACLE_CARD_TAG") return `https://scryfall.com/search?q=${encodeURIComponent(`oracletag:"${name}"`)}`;
  if (type === "ILLUSTRATION_TAG") return `https://scryfall.com/search?q=${encodeURIComponent(`arttag:"${name}"`)}`;
  return `https://scryfall.com/search?q=${encodeURIComponent(`"${name}"`)}`;
}
