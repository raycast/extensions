import { Detail, LaunchProps, popToRoot, showToast, Toast } from "@raycast/api";
import { open } from "@raycast/api";
import { SearchEngine, useFindSearchEngine } from "./lib/search-engines";

type Props = LaunchProps<{ arguments: { query: string }; fallbackText?: string }>;

export default function Command(props: Props) {
  const query = props.arguments.query ?? props.fallbackText ?? "";
  const trimmedQuery = query.trim();
  const match = trimmedQuery.match(/!(\S+)/i);
  const searchEngineKey = match?.[1]?.toLowerCase();
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();

  useFindSearchEngine({
    searchEngineKey,
    onSearchEngineFound: async (searchEngine) => {
      await performSearch(searchEngine, cleanQuery);
    },
  });

  const performSearch = async (searchEngine: SearchEngine, cleanQuery: string) => {
    console.log("Performing search with search engine:", searchEngine, cleanQuery);
    try {
      const searchUrl = searchEngine.u.replace("{{{s}}}", encodeURIComponent(cleanQuery).replace(/%2F/g, "/"));

      if (searchUrl) {
        await openUrl(searchUrl);
        popToRoot({ clearSearchBar: true });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid search",
          message: "Could not generate a search URL",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Search Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const openUrl = async (url: string) => {
    try {
      await open(url);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open URL",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Detail
      markdown={`Searching for: \`${cleanQuery}\` using ${searchEngineKey ? `!${searchEngineKey}` : "default search engine"}`}
    />
  );
}
