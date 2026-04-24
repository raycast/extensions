/**
 * Fillerama API client
 *
 * @version 1.0.0
 * Wraps the Fillerama API by Chris Valleskey (http://chrisvalleskey.com/fillerama/)
 */

export const SHOWS = [
  { id: "futurama", title: "Futurama" },
  { id: "simpsons", title: "The Simpsons" },
  { id: "holygrail", title: "Monty Python & the Holy Grail" },
  { id: "arresteddevelopment", title: "Arrested Development" },
  { id: "dexter", title: "Dexter" },
  { id: "doctorwho", title: "Doctor Who" },
  { id: "starwars", title: "Star Wars" },
  { id: "loremipsum", title: "Lorem Ipsum" },
] as const;

export type ShowId = (typeof SHOWS)[number]["id"];

export interface FilleramaResponse {
  db: Array<{ source: string; quote: string }>;
  headers: Array<{ source: string; header: string }>;
}

// Using HTTP because the API does not provide HTTPS.
const BASE_URL = "http://api.chrisvalleskey.com/fillerama/get.php";

export async function fetchQuotes(show: ShowId): Promise<FilleramaResponse> {
  const url = `${BASE_URL}?count=ALL&format=json&show=${show}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fillerama API error: ${res.status}`);
  return res.json() as Promise<FilleramaResponse>;
}

/** Pick `count` random sentences from the quotes pool. */
export function pickQuotes(
  response: FilleramaResponse,
  count: number,
  type: "db" | "headers" = "db"
): string[] {
  const pool =
    type === "db"
      ? response.db.map((q) => q.quote.trim())
      : response.headers.map((h) => h.header.trim());
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Join quotes into a paragraph, HTML-entity-decoded. */
export function buildText(quotes: string[]): string {
  return quotes
    .join(" ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}
