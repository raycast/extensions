export { getPullRequestStatus } from "./pull-request";

export function pluralize(
  count: number,
  noun: string,
  { suffix = "s", withNumber = false }: { suffix?: string; withNumber?: boolean } = {}
): string {
  let pluralizedNoun = `${noun}${count !== 1 ? suffix : ""}`;
  if (noun === "Branch") {
    pluralizedNoun = `${noun}es`;
  }
  return withNumber ? `${count} ${pluralizedNoun}` : pluralizedNoun;
}
