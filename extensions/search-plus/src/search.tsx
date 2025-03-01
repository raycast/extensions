import { LaunchProps, showToast, Toast } from "@raycast/api";
import { open } from "@raycast/api";
import { findSearchEngine, SearchEngine } from "./lib/search-engines";

type Props = LaunchProps<{ arguments: { query: string }; fallbackText?: string }>;

export default async function search(props: Props) {
  const query = (props.arguments.query ?? props.fallbackText) as string;
  const trimmedQuery = query.trim();
  const match = trimmedQuery.match(/!(\S+)/i);
  const searchEngineKey = match?.[1]?.toLowerCase();
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();

  const performSearch = async (searchEngine: SearchEngine, cleanQuery: string) => {
    console.log("Performing search with search engine:", searchEngine, cleanQuery);
    try {
      const searchUrl = searchEngine.u.replace("{{{s}}}", encodeURIComponent(cleanQuery).replace(/%2F/g, "/"));

      if (searchUrl) {
        await openUrl(searchUrl);
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

  const searchEngine = await findSearchEngine(searchEngineKey);
  await performSearch(searchEngine, cleanQuery);
}
