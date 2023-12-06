type OffsetApiRequester<T> = (input: {
  limit: number | undefined;
  offset: number | undefined;
}) => Promise<{ items?: T[]; next: string | null; total: number }>;

export async function* iterateWithOffset<T>(
  limit: number,
  requester: OffsetApiRequester<T>,
): AsyncGenerator<{ items?: T[]; total: number; offset: number }, void, unknown> {
  const batchSize = 50;
  let hasMore = true;
  let offset = 0;
  while (hasMore && offset < limit) {
    const response = await requester({ limit: batchSize, offset });
    yield { items: response.items || [], total: response.total, offset: offset };
    offset += response.items?.length || 0;
    hasMore = response.next !== null;
  }
}

type AfterApiRequester<T extends { id?: string }> = (input: {
  after?: string;
  limit: number;
}) => Promise<{ items?: T[] }>;

export async function* iterateWithAfter<T extends { id?: string }>(
  limit: number,
  requester: AfterApiRequester<T>,
): AsyncGenerator<{ items: T[]; offset: number }, void, unknown> {
  const batchSize = 50;
  let after = null;
  let hasMore = true;
  let count = 0;
  while (hasMore && count < limit) {
    const response = await requester({ after: after ?? undefined, limit: batchSize });
    const items = response.items || [];
    yield { items, offset: count };
    after = items.length > 0 ? items[items.length - 1].id : null;
    hasMore = after !== null;
    count += items.length;
  }
}
