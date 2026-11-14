import type { IGif } from "../models/gif";
import type { ServiceName } from "../preferences";

type SourceCursor = { page: number; next?: string; done: boolean };
export type AllSourcesCursor = Partial<Record<ServiceName, SourceCursor>>;
export type SourceFailure = { service: ServiceName; error: Error };
export type SourcePage = { results: IGif[]; next?: string };
export type LoadSourcePage = (service: ServiceName, opt: { next?: string; offset: number }) => Promise<SourcePage>;

export function interleave<T>(lists: T[][]): T[] {
  const longest = Math.max(0, ...lists.map((list) => list.length));
  const mixed: T[] = [];
  for (let index = 0; index < longest; index++) {
    for (const list of lists) {
      if (index < list.length) mixed.push(list[index]);
    }
  }
  return mixed;
}

export async function fetchAllSourcesPage(
  services: ServiceName[],
  cursor: AllSourcesCursor,
  limit: number,
  load: LoadSourcePage,
) {
  const active = services.filter((service) => !cursor[service]?.done);
  const pages = await Promise.allSettled(
    active.map((service) => {
      const state = cursor[service];
      return load(service, { next: state?.next, offset: (state?.page ?? 0) * limit });
    }),
  );

  const nextCursor: AllSourcesCursor = { ...cursor };
  const lists: IGif[][] = [];
  const failures: SourceFailure[] = [];

  pages.forEach((page, index) => {
    const service = active[index];
    if (page.status === "rejected") {
      // A provider that failed once is dropped for the rest of this search, so it can't stall later pages.
      nextCursor[service] = { page: cursor[service]?.page ?? 0, done: true };
      failures.push({ service, error: page.reason instanceof Error ? page.reason : new Error(String(page.reason)) });
      return;
    }

    const { results, next } = page.value;
    const hasMore = next === undefined ? results.length === limit : next !== "";
    nextCursor[service] = { page: (cursor[service]?.page ?? 0) + 1, next, done: !hasMore };
    lists.push(results);
  });

  return {
    results: interleave(lists),
    cursor: nextCursor,
    hasMore: services.some((service) => !nextCursor[service]?.done),
    failures,
    allFailed: active.length > 0 && failures.length === active.length,
  };
}
