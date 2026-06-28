export { getPullRequestStatus } from "./pull-request";

export function pluralize(
  count: number,
  noun: string,
  { suffix = "s", withNumber = false }: { suffix?: string; withNumber?: boolean } = {},
): string {
  const pluralizedNoun = `${noun}${count !== 1 ? suffix : ""}`;
  return withNumber ? `${count} ${pluralizedNoun}` : pluralizedNoun;
}
