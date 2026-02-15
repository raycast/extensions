export interface RootSearchSummary {
  files: string[];
  failedRoots: string[];
}

export async function searchRootsInParallel(
  roots: string[],
  searchRoot: (root: string) => Promise<string[]>,
): Promise<RootSearchSummary> {
  const settled = await Promise.allSettled(
    roots.map((root) => searchRoot(root)),
  );
  const files: string[] = [];
  const failedRoots: string[] = [];

  for (let index = 0; index < settled.length; index += 1) {
    const result = settled[index];
    const root = roots[index];

    if (result.status === "fulfilled") {
      files.push(...result.value);
    } else {
      failedRoots.push(root);
    }
  }

  return {
    files,
    failedRoots,
  };
}

export async function searchRootsWithPartialFallback(
  roots: string[],
  searchRoot: (root: string) => Promise<string[]>,
  searchFallbackRoots: (failedRoots: string[]) => Promise<string[]>,
): Promise<string[]> {
  const primary = await searchRootsInParallel(roots, searchRoot);

  if (primary.failedRoots.length === 0) {
    return primary.files;
  }

  const fallback = await searchFallbackRoots(primary.failedRoots);
  return [...primary.files, ...fallback];
}

function normalizeConcurrency(concurrency: number): number {
  if (!Number.isFinite(concurrency)) return 1;
  if (concurrency < 1) return 1;
  return Math.trunc(concurrency);
}

export async function filterByAsyncPredicate<T>(
  input: T[],
  predicate: (value: T, index: number) => Promise<boolean>,
  concurrency = 32,
): Promise<T[]> {
  if (input.length === 0) return [];

  const safeConcurrency = Math.min(
    normalizeConcurrency(concurrency),
    input.length,
  );
  const keep = new Array<boolean>(input.length).fill(false);
  let index = 0;

  const workers = Array.from({ length: safeConcurrency }, async () => {
    while (true) {
      const currentIndex = index;
      index += 1;

      if (currentIndex >= input.length) {
        return;
      }

      keep[currentIndex] = await predicate(input[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return input.filter((_, currentIndex) => keep[currentIndex]);
}
