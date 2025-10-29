import * as cheerio from "cheerio";
import fetch, { FormData } from "node-fetch";
import { useMemo, useRef } from "react";

import { captureException, environment } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";

import type { ErrorResult, RuntimeCompat, SearchResult, SearchResults } from "@/types";

type SearchAPIData = {
  apiKey: string;
  indexId: string;
};
type SearchAPIDataResponse = {
  v: Array<Array<object | SearchAPIData> | Array<never>>;
};

/**
 * This function will download the frontpage of jsr.io and extract the apiKey + indexId from the script tags.
 */
const useSearchAPIData = () => {
  return useFetch<SearchAPIData | null>("https://jsr.io", {
    method: "GET",
    headers: {
      Agent: `Raycast/${environment.raycastVersion} ${environment.extensionName} (https://raycast.com)`,
    },
    keepPreviousData: true,
    parseResponse: async (response) => {
      let res: SearchAPIData | null = null;
      const text = await response.text();
      const $ = cheerio.load(text);

      const scriptElements = $("script");

      scriptElements.each((_index, element) => {
        const script = $(element).html();

        if (script?.includes(`apiKey`)) {
          const start = script.indexOf(`"[[`) + 1;
          const end = script.indexOf(`]"`) + 1;
          const slice = script.slice(start, end).replace(/\\/g, "");
          try {
            const arr = JSON.parse(slice);
            // find element that is string and starts with 'jsr-'
            const indexIdPosition = arr.findIndex(
              (item: unknown) => typeof item === "string" && item.startsWith("jsr-"),
            );
            if (indexIdPosition !== -1 && indexIdPosition > 0 && typeof arr[indexIdPosition - 1] === "string") {
              res = { apiKey: arr[indexIdPosition - 1], indexId: arr[indexIdPosition] };
            }
            // eslint-disable-next-line no-empty
          } catch {}
        }

        if (script?.includes(`"apiKey"`)) {
          const json = JSON.parse(script) as SearchAPIDataResponse;
          const searchAPIData = json.v[0].find((item) => "apiKey" in item && "indexId" in item) as
            | SearchAPIData
            | undefined;
          if (searchAPIData) {
            res = searchAPIData;
          }
        }
      });

      return res;
    },
  });
};

/*
To filter for packages that are compatible with Deno, you can use the query runtime:deno. To filter for packages that are compatible with Node.js, you can use the query runtime:node. You can also combine these filters, for example runtime:deno runtime:browsers will return packages that are compatible with both Deno and web browsers. The possible values for the runtime filter are deno, node, browsers, workerd (Cloudflare Workers), and bun.
*/
const runtimeFilters = {
  deno: "runtime:deno",
  node: "runtime:node",
  browsers: "runtime:browsers",
  workerd: "runtime:workerd",
  bun: "runtime:bun",
};

const useScopes = (queryString: string, scoped: string | null) => {
  const query = queryString?.trim() || "";
  const terms = query.split(" ").filter((term) => term.trim() !== "");
  const scopeTerm = terms.find((term) => term.startsWith("scope:"));
  const runtimeTerms = terms.filter((term) => Object.values(runtimeFilters).includes(term));
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

  return {
    runtimes,
    scope: scopeValue,
    query: queryValue,
    // The trigger query is only used to determine if we need to fetch
    triggerQuery: `${scopeValue ? `@${scopeValue}/` : ""}${queryValue}${runtimeTerms.length > 0 ? ` ${runtimeTerms.join("|")}` : ""}`,
  };
};

export const useJSRSearch = (queryString: string, scoped: string | null) => {
  const { query, scope, triggerQuery, runtimes } = useScopes(queryString, scoped);
  const { data: apiData, isLoading: isLoadingAPIData, error: apiDataError } = useSearchAPIData();
  const abortable = useRef<AbortController>();

  const searchURL = useMemo(() => {
    if (!apiData || isLoadingAPIData) {
      return null;
    }
    return `https://cloud.orama.run/v1/indexes/${apiData.indexId}/search?api-key=${apiData.apiKey}`;
  }, [apiData, isLoadingAPIData]);

  const formData = useMemo(() => {
    const whereClauses = Array<{ [key: string]: unknown }>();
    if (scope) {
      whereClauses.push({ scope: scope });
    }
    Object.entries(runtimes).forEach(([key, value]) => {
      if (value) {
        whereClauses.push({ [`runtimeCompat.${key}`]: true });
      }
    });
    const whereClause =
      whereClauses.length > 0 ? { where: whereClauses.reduce((acc, clause) => ({ ...acc, ...clause }), {}) } : {};
    const body = {
      term: query,
      limit: 50,
      mode: "fulltext",
      boost: { id: 3, scope: 2, name: 1, description: 0.5 },
      ...whereClause,
    };
    const formData = new FormData();
    formData.append("q", JSON.stringify(body));
    return formData;
  }, [query, scope]);

  const {
    isLoading,
    error: dataError,
    ...rest
  } = useCachedPromise(
    async (url: string | null, triggerQuery: string) => {
      if (!url || !triggerQuery) {
        return [] as SearchResult[];
      }
      return fetch(url, {
        method: "POST",
        signal: abortable.current?.signal,
        body: formData,
      })
        .then((response) => response.json() as Promise<SearchResults | ErrorResult>)
        .then((data) => {
          if ("message" in data) {
            captureException(data.message);
            return [];
          }

          return data.hits.filter((h) => !!h.id && !!h.document.id);
        });
    },
    [searchURL, triggerQuery],
    {
      abortable,
      initialData: [] as SearchResult[],
    },
  );

  return { isLoading: isLoading || isLoadingAPIData, error: dataError || apiDataError, ...rest };
};
