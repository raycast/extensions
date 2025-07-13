import { useCachedPromise } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { Link } from "../types";
import { fetchLinks } from "../utils/api";
import { getCachedLinks, setCachedLinks } from "../utils/cache";
import { useTranslation } from "./useTranslation";

interface FetchLinksResponse {
  links: Link[];
  cursor?: string;
  list_complete: boolean;
}

export function useLinks() {
  const { t } = useTranslation();

  async function cleanCache() {
    await setCachedLinks([]);
  }

  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    let allLinks: Link[] = [];
    let currentCursor: string | undefined = undefined;
    let isComplete = false;

    const cachedLinks = await getCachedLinks();
    if (cachedLinks && cachedLinks.length > 0) {
      return cachedLinks;
    }

    while (!isComplete) {
      try {
        const response = (await fetchLinks(currentCursor)) as FetchLinksResponse;
        allLinks = [...allLinks, ...response.links];
        currentCursor = response.cursor;
        isComplete = !response.cursor || response.list_complete;
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: t.errorFetchingLinks,
          message: String(error),
        });
        isComplete = true;
      }
    }

    await setCachedLinks(allLinks);
    return allLinks;
  }, []);

  const refreshLinks = async () => {
    await cleanCache();
    await revalidate();
  };

  return {
    links: data ?? [],
    isLoading,
    refreshLinks,
    cleanCache,
  };
}
