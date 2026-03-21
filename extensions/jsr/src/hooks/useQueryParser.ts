import { useMemo } from "react";

import type { RuntimeCompat } from "@/types";

import { runtimeFilterValues, runtimeFilters } from "@/lib/filters";

/**
 * This type represents the parsed query object.
 */
export type ParsedQuery = {
  /** The runtimes. This is used to add runtime filters in the where clause of the Orama search. */
  runtimes: RuntimeCompat;
  /** The scope. This is used to add the scope filter in the where clause of the Orama search. */
  scope: string | null;
  /** The query. This is used to add the query in the body of the Orama search. */
  query: string;
  /** The search query url as used on the website */
  searchQueryURL: string;
  /** The trigger query. This is used to trigger the search (internal) */
  triggerQuery: string;
};

/**
 * This hook parses the query string and returns a parsed query object.
 *
 * @param {string} queryString - The query string to parse.
 * @param {string | null} scoped - The scoped to parse.
 * @returns {ParsedQuery} - The parsed query object.
 */
export const useQueryParser = (queryString: string, scoped: string | null): ParsedQuery => {
  const query = queryString?.trim() || "";
  const terms = query.split(" ").filter((term) => term.trim() !== "");
  const scopeTerm = terms.find((term) => term.startsWith("scope:"));
  const runtimeTerms = terms.filter((term) => runtimeFilterValues.includes(term));
  const otherTerms = terms.filter((term) => term !== scopeTerm && !runtimeTerms.includes(term));

  const filteredQuery = otherTerms.join(" ").trim();
  const runtimes: RuntimeCompat = runtimeTerms.reduce((acc, term) => {
    const runtime = term.replace("runtime:", "").trim();
    if (runtime in runtimeFilters) {
      acc[runtime as keyof RuntimeCompat] = true;
    }
    return acc;
  }, {} as RuntimeCompat);

  const splittedQuery = filteredQuery.split("/");
  const onlyScoped =
    filteredQuery.startsWith("@") &&
    (splittedQuery.length === 1 ||
      (filteredQuery.endsWith("/") && splittedQuery.length === 2 && splittedQuery[1].trim() === ""));

  const queryValue = onlyScoped ? "" : filteredQuery;
  const scopeValue = scopeTerm
    ? scopeTerm.replace("scope:", "").trim()
    : onlyScoped
      ? filteredQuery.replace("@", "").replace("/", "")
      : scoped;

  const searchQueryURL = useMemo(() => {
    let query = queryValue;
    if (scopeValue) {
      query += ` scope:${scopeValue}`;
    }
    Object.entries(runtimes).forEach(([key, value]) => {
      if (value) {
        query += ` runtime:${key}`;
      }
    });
    return `https://jsr.io/packages?search=${encodeURIComponent(query.trim())}`;
  }, [queryValue, scopeValue, runtimes]);

  return {
    runtimes,
    scope: scopeValue,
    query: queryValue,
    searchQueryURL,
    // The trigger query is only used to determine if we need to fetch
    triggerQuery: `${scopeValue ? `@${scopeValue}/` : ""}${queryValue}${runtimeTerms.length > 0 ? ` ${runtimeTerms.join("|")}` : ""}`,
  };
};
