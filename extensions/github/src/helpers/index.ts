export { getPullRequestStatus } from "./pull-request";

export type RevalidateList = () => Promise<unknown>;

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function compactFragmentNodes<T>(items: readonly unknown[] | null | undefined): T[] {
  return (items?.filter((item) => typeof item === "object" && item !== null && "id" in item) ?? []) as T[];
}

export function pluralize(
  count: number,
  noun: string,
  { suffix = "s", withNumber = false }: { suffix?: string; withNumber?: boolean } = {},
): string {
  const pluralizedNoun = `${noun}${count !== 1 ? suffix : ""}`;
  return withNumber ? `${count} ${pluralizedNoun}` : pluralizedNoun;
}
