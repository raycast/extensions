import { LaunchProps, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDefaultSearchEngine } from "./data/cache";
import { builtinSearchEngines } from "./data/builtin-search-engines";
import { getCustomSearchEngines } from "./data/custom-search-engines";
import { isValidUrl, safeOpenUrl } from "./utils";

export default async function search(props: LaunchProps<{ arguments: { query: string }; fallbackText?: string }>) {
  try {
    const rawQuery = (props.arguments.query ?? props.fallbackText) as string;

    const { searchEngine, finalQuery, searchEngineKey } = processQuery(rawQuery);

    if (!searchEngine) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Search engine not found: ${searchEngineKey}`,
      });
      return;
    }

    if (!finalQuery) {
      const url = new URL(searchEngine.u);
      await safeOpenUrl(url.origin);
      return;
    }

    const searchUrl = searchEngine.u.replace("{{{s}}}", encodeURIComponent(finalQuery).replace(/%2F/g, "/"));

    if (!isValidUrl(searchUrl)) {
      throw new Error(`Invalid URL: ${searchUrl}`);
    }

    await safeOpenUrl(searchUrl);
  } catch (error) {
    await showFailureToast(error);
  }
}

function findSearchEngine(key?: string) {
  if (!key) return null;

  // First check custom search engines
  const customEngines = getCustomSearchEngines();
  const customEngine = customEngines.find((engine) => engine.t === key.toLowerCase());
  if (customEngine) return customEngine;

  // Then check built-in search engines
  return builtinSearchEngines.find((engine) => engine.t === key.toLowerCase());
}

function processQuery(rawQuery: string) {
  let query = rawQuery.trim();

  const searchEngineKeyMatch = query.match(/!(\S+)/i);
  const searchEngineKey = searchEngineKeyMatch?.[1]?.toLowerCase();
  const searchEngine = findSearchEngine(searchEngineKey);

  if (query.includes("@")) {
    const siteMatch = query.match(/@(\S+)/i);
    const siteKey = siteMatch?.[1]?.toLowerCase();

    if (siteKey) {
      const siteEngine = findSearchEngine(siteKey);
      if (siteEngine) {
        query = query.replace(/@\S+\s*/i, "").trim();
        query += ` site:${siteEngine.ad || siteEngine.d}`;
      }
    }
  }

  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
  let finalQuery = cleanQuery;
  if (!searchEngine && searchEngineKey) {
    finalQuery = `${searchEngineKey} ${cleanQuery}`;
  }

  return { searchEngine: searchEngine || getDefaultSearchEngine(), finalQuery, searchEngineKey };
}
