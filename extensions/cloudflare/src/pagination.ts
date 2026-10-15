export interface PageResult<T> {
  items: T[];
  totalPages: number;
}

export async function collectPaginatedItems<T>(
  fetchPage: (page: number) => Promise<PageResult<T>>,
): Promise<T[]> {
  const firstPage = await fetchPage(1);
  const items = [...firstPage.items];
  for (let page = 2; page <= firstPage.totalPages; page++) {
    items.push(...(await fetchPage(page)).items);
  }
  return items;
}
