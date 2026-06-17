import { open } from "@raycast/api";
import { buildOrbitHomeUrl } from "../lib/orbit";

type Input = {
  /**
   * Non-empty Orbit search query.
   *
   * Supported syntax:
   * - Basic terms: `design review`
   * - Exact phrases: `"design review"`
   * - Boolean operators: `AND`, `OR`, `NOT`
   * - Grouping: `(invoice OR receipt) NOT draft`
   * - Prefix wildcard (suffix only): `invoice*`
   * - App filters: `＠Slack`, `＠"Microsoft Teams"`
   *
   * Avoid:
   * - Regex-like syntax (for example `invoice dot-star` patterns)
   * - Leading/infix wildcards: `*invoice`, `in*voice`
   * - Unquoted multi-word app names: `＠Microsoft Teams`
   *
   * Preserve user-provided operators, quotes, and parentheses. App filters
   * are always OR joined and cannot be used to exclude apps (for example, `NOT @Slack` is not valid).
   */
  searchQuery: string;
};

/**
 * Opens Orbit with the provided search query.
 *
 * @example
 * await searchOrbit({ searchQuery: "invoice OR receipt ＠Chrome" });
 * // => { url: "orbit://home?search=invoice+OR+receipt+%40Chrome" }
 *
 * @example
 * await searchOrbit({
 *   searchQuery: "\"pull request\" AND review ＠\"GitHub Desktop\"",
 * });
 * // => { url: "orbit://home?search=%22pull+request%22+AND+review+%40%22GitHub+Desktop%22" }
 */
export default async function searchOrbit(input: Input) {
  const searchQuery = input.searchQuery.trim();
  if (!searchQuery) {
    throw new Error("searchQuery must be a non-empty string");
  }

  const url = buildOrbitHomeUrl(searchQuery);
  await open(url);

  return { url };
}
