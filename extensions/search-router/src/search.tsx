import { LaunchProps, showToast, Toast } from "@raycast/api";
import { open } from "@raycast/api";
import { searchEngines } from "./data/search-engines";
import { showFailureToast } from "@raycast/utils";
import { getDefaultSearchEngine } from "./data/cache";

export default async function search(props: LaunchProps<{ arguments: { query: string }; fallbackText?: string }>) {
  try {
    const rawQuery = (props.arguments.query ?? props.fallbackText) as string;

    const { searchEngine, cleanQuery, searchEngineKey } = processQuery(rawQuery);

    if (!searchEngine) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Search engine not found: ${searchEngineKey}`,
      });
      return;
    }

    if (!cleanQuery) {
      const url = new URL(searchEngine.u);
      await open(url.origin);
      return;
    }

    const searchUrl = searchEngine.u.replace("{{{s}}}", encodeURIComponent(cleanQuery).replace(/%2F/g, "/"));
    await open(searchUrl);
  } catch (error) {
    await showFailureToast(error);
  }
}

function findSearchEngine(key?: string) {
  if (!key) return null;
  return searchEngines.find((engine) => engine.t === key.toLowerCase());
}

function processQuery(rawQuery: string) {
  let query = rawQuery.trim();

  const searchEngineKeyMatch = query.match(/!(\S+)/i);
  const searchEngineKey = searchEngineKeyMatch?.[1]?.toLowerCase();
  const searchEngine = findSearchEngine(searchEngineKey) || getDefaultSearchEngine();

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

  return { searchEngine, cleanQuery, searchEngineKey };
}
