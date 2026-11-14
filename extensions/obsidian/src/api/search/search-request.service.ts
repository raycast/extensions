interface SearchRequestOptions<T> {
  search: () => Promise<T>;
  isStale: () => boolean;
  onResults: (results: T) => void;
  onSettled: () => void;
}

export async function runSearchRequest<T>({
  search,
  isStale,
  onResults,
  onSettled,
}: SearchRequestOptions<T>): Promise<void> {
  try {
    const results = await search();
    if (!isStale()) {
      onResults(results);
    }
  } finally {
    if (!isStale()) {
      onSettled();
    }
  }
}
