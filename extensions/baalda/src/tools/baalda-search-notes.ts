import { listVaults, searchNotes } from "../lib/baalda";

type Input = {
  /** What to search for. Natural language works (semantic search). */
  query: string;
  /** Vault id from baalda-list-vaults. Omit to search every accessible vault. */
  vaultId?: string;
  /** Max results per vault (default 10, max 50). */
  k?: number;
};

/**
 * Semantic + keyword search over notes in Baalda vaults.
 * Returns ranked docIds. Follow up with baalda-read-note to get full content.
 */
export default async function tool(input: Input): Promise<string> {
  const targets = input.vaultId
    ? [{ vaultId: input.vaultId, name: input.vaultId }]
    : ((await listVaults()) ?? []).map((v) => ({ vaultId: v.vaultId, name: v.name }));

  const settled = await Promise.allSettled(
    targets.map(async (v) =>
      (await searchNotes(v.vaultId, input.query, Math.min(input.k ?? 10, 50))).map((r) => ({
        vault: v.name,
        vaultId: v.vaultId,
        ...r,
      })),
    ),
  );

  const results = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  if (results.length === 0) return `No notes found for "${input.query}".`;
  return JSON.stringify(results, null, 2);
}
