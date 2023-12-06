type ApiRequester<T> = (input: {
  limit: number | undefined;
  offset: number | undefined;
}) => Promise<{ items?: T[]; next: string | null }>;

export async function* iterate<T>(limit: number, requester: ApiRequester<T>) {
  const batchSize = 50;
  let hasMore = true;
  let offset = 0;
  while (hasMore && offset < limit) {
    const response = await requester({ limit: batchSize, offset });
    yield response.items || [];
    offset += response.items?.length || 0;
    hasMore = response.next !== null;
  }
}
