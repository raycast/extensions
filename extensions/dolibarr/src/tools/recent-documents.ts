import { fetchRecentDocuments } from "../api/documents";
import type { DocumentKind } from "../api/types";
import { buildRecentDocuments, type RecentDocument } from "./recentDocuments";
import { getToolContext } from "./toolContext";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const ALL_KINDS: DocumentKind[] = ["proposal", "order", "invoice"];

type Input = {
  /** Belegart: "proposal", "order" oder "invoice". Ohne Angabe werden alle drei berücksichtigt. */
  kind?: DocumentKind;
  /** Anzahl der Belege, Vorgabe 10, höchstens 50. */
  limit?: number;
};

export default async function tool(input: Input): Promise<{ count: number; documents: RecentDocument[] }> {
  const { client, index, web } = await getToolContext();

  const limit = Math.min(Math.max(Math.trunc(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  const kinds = input.kind ? [input.kind] : ALL_KINDS;

  // Each kind is fetched with the same limit; merging then trims to the requested count.
  const batches = await Promise.all(kinds.map((kind) => fetchRecentDocuments(client, kind, limit)));

  return buildRecentDocuments(batches.flat(), index.thirdparties, web, limit);
}
