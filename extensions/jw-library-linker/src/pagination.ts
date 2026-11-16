export async function readSnapshotPage<T>(
  page: number,
  cursor: readonly T[] | undefined,
  load: () => Promise<readonly T[]>,
  pageSize: number,
): Promise<{ data: T[]; cursor: readonly T[]; hasMore: boolean }> {
  // Page zero starts a new search/refresh. Later pages reuse its exact ordering,
  // even if the source array or database changes before the next request.
  const snapshot = page === 0 ? [...(await load())] : cursor;
  if (!snapshot) throw new Error("The search snapshot is unavailable. Refresh and try again.");
  return {
    data: snapshot.slice(page * pageSize, (page + 1) * pageSize),
    cursor: snapshot,
    hasMore: (page + 1) * pageSize < snapshot.length,
  };
}
