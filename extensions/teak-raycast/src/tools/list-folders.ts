import { listFolders } from "../lib/api";

type Input = {
  /** Optional substring to filter folder names (case-insensitive). */
  filter?: string;
  /** Maximum number of folders to return. Defaults to 50. */
  limit?: number;
};

export default async function tool(input: Input = {}) {
  const { items } = await listFolders("silent");

  const normalizedFilter = input.filter?.trim().toLowerCase();
  const filtered = normalizedFilter
    ? items.filter((folder) =>
        folder.name.toLowerCase().includes(normalizedFilter),
      )
    : items;

  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));

  return filtered.slice(0, limit).map((folder) => ({
    cardCount: folder.cardCount,
    folderId: folder.id,
    kind: folder.kind,
    name: folder.name,
    query: folder.query,
  }));
}
