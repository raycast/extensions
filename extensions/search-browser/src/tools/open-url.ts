import { Tool, getPreferenceValues } from "@raycast/api";
import { openUrlInSearch } from "../lib/browser";
import { SearchEngineId } from "../lib/constants";
import { readBrowserSettings } from "../lib/data";
import { buildNavigableUrl } from "../lib/utils";

type Input = {
  /** An HTTP(S) website URL or web search query to open in Search Browser. */
  urlOrQuery: string;
};

function resolveSafeHttpTarget(rawInput: string) {
  const preferences = getPreferenceValues<Preferences>();
  const settings = readBrowserSettings();
  const result = buildNavigableUrl(rawInput, preferences.searchEngine as SearchEngineId | undefined, settings);
  if (!/^https?:\/\//i.test(result.url)) {
    throw new Error("Only http:// and https:// URLs or web search queries are allowed.");
  }
  return result;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const raw = input.urlOrQuery?.trim() || "";
  const target = raw ? resolveSafeHttpTarget(raw) : null;
  return {
    message: target?.isSearch ? `Search ${target.engineName} in Search Browser?` : "Open this URL in Search Browser?",
    info: [
      { name: "Destination", value: target?.url ?? raw },
      ...(target?.isSearch ? [{ name: "Search Engine", value: target.engineName }] : []),
    ],
  };
};

export default async function tool(input: Input) {
  const raw = input.urlOrQuery?.trim();
  if (!raw) {
    return { opened: false, error: "A URL or search query is required." };
  }

  const { url, isSearch, engineName } = resolveSafeHttpTarget(raw);
  await openUrlInSearch(url);

  return {
    opened: true,
    url,
    isSearch,
    engine: isSearch ? engineName : undefined,
  };
}
