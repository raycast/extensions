import { getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import { open } from "@raycast/api";
import { searchEngines } from "./data/search-engines";

const defaultSearchEngineKey = getPreferenceValues<{ defaultSearchEngine: string }>().defaultSearchEngine;
const defaultSearchEngine = searchEngines.find((engine) => engine.t === defaultSearchEngineKey);

export default async function search(props: LaunchProps<{ arguments: { query: string }; fallbackText?: string }>) {
  try {
    const query = (props.arguments.query ?? props.fallbackText) as string;
    const match = query.trim().match(/!(\S+)/i);
    const searchEngineKey = match?.[1]?.toLowerCase();

    const searchEngine = searchEngines.find((engine) => engine.t === searchEngineKey) ?? defaultSearchEngine;
    if (!searchEngine) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Search engine not found: ${searchEngineKey}`,
      });
      return;
    }

    const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
    const searchUrl = searchEngine.u.replace("{{{s}}}", encodeURIComponent(cleanQuery).replace(/%2F/g, "/"));
    await open(searchUrl);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unexpected Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
