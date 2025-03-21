import { LaunchProps, showToast, Toast } from "@raycast/api";
import { open } from "@raycast/api";
import { searchEngines } from "./data/search-engines";
import { showFailureToast } from "@raycast/utils";
import { getDefaultSearchEngine } from "./data/cache";

export default async function search(props: LaunchProps<{ arguments: { query: string }; fallbackText?: string }>) {
  try {
    const query = (props.arguments.query ?? props.fallbackText) as string;
    const match = query.trim().match(/!(\S+)/i);
    const searchEngineKey = match?.[1]?.toLowerCase();

    const searchEngine =
      (searchEngineKey && searchEngines.find((engine) => engine.t === searchEngineKey)) || getDefaultSearchEngine();

    if (!searchEngine) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Search engine not found: ${searchEngineKey}`,
      });
      return;
    }

    const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
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
