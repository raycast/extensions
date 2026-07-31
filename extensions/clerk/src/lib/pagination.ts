export function getPageParams(page: number, pageSize: number): { limit: number; offset: number } {
  return { limit: pageSize, offset: page * pageSize };
}

export function computeHasMore(offset: number, fetchedCount: number, totalCount: number): boolean {
  return offset + fetchedCount < totalCount;
}
