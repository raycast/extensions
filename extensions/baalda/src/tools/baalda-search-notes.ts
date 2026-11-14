import { listVaults, searchNotes } from "../lib/baalda";

type Input = {
  /** What to search for. Natural language works (semantic search). */
  query: string;
  /** Vault id from baalda-list-vaults. Omit to search every accessible vault. */
  vaultId?: string;
  /** Max results per vault (default 10, max 50). */
  k?: number;
};

type SearchFailure = {
  vault: string;
  vaultId: string;
  error: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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

  const results = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const failures = settled.flatMap((result, index): SearchFailure[] => {
    if (result.status === "fulfilled") return [];
    const vault = targets[index];
    return [{ vault: vault.name, vaultId: vault.vaultId, error: errorMessage(result.reason) }];
  });

  if (targets.length > 0 && failures.length === targets.length) {
    throw new Error(
      `Search failed in every selected vault: ${failures
        .map((failure) => `${failure.vault}: ${failure.error}`)
        .join("; ")}`,
    );
  }
  if (results.length === 0 && failures.length === 0) return `No notes found for "${input.query}".`;
  return JSON.stringify(failures.length > 0 ? { results, failures } : results, null, 2);
}
