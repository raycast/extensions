import { openMemoryMachineUrl } from "../lib/installed-app";
import { buildMemoryMachineSearchUrl } from "../lib/memory-machine";

type Input = {
  /**
   * Non-empty Memory Machine search query.
   *
   * Supported syntax:
   * - Basic terms: `design review`
   * - Exact phrases: `"design review"`
   * - Boolean operators: `AND`, `OR`, `NOT`
   * - Grouping: `(invoice OR receipt) NOT draft`
   * - Prefix wildcard (suffix only): `invoice*`
   * - App filters: `app:Slack`, `app:"Microsoft Teams"`, `app:(Chrome OR Safari)`
   * - Other fields: `text:project`, `title:"Meeting Notes"`, `site:apple.com`, `url:apple.com/iphone`
   *
   * Avoid:
   * - Regex-like syntax (for example `invoice dot-star` patterns)
   * - Leading/infix wildcards: `*invoice`, `in*voice`
   * - Unquoted multi-word app names: `app:Microsoft Teams`
   *
   * Preserve user-provided operators, quotes, and parentheses. Group keyword alternatives
   * before adding an app filter that applies to all of them, as in `(invoice OR receipt) app:Chrome`.
   */
  searchQuery: string;
};

/**
 * Opens Memory Machine Search with the provided query.
 *
 * @example
 * await openMemoryMachineSearch({ searchQuery: "(invoice OR receipt) app:Chrome" });
 * // => { url: "memorymachine://search?term=%28invoice+OR+receipt%29+app%3AChrome" }
 *
 * @example
 * await openMemoryMachineSearch({
 *   searchQuery: "\"pull request\" AND review app:\"GitHub Desktop\"",
 * });
 * // => { url: "memorymachine://search?term=%22pull+request%22+AND+review+app%3A%22GitHub+Desktop%22" }
 */
export default async function openMemoryMachineSearch(input: Input) {
  const searchQuery = input.searchQuery.trim();
  if (!searchQuery) {
    throw new Error("searchQuery must be a non-empty string");
  }

  const url = buildMemoryMachineSearchUrl(searchQuery);
  await openMemoryMachineUrl(url);

  return { url };
}
