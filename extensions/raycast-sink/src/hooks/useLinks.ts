import { useState, useEffect } from "react";
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
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  async function cleanCache() {
    await setCachedLinks([]);
  }

  async function fetchAllLinks() {
    let allLinks: Link[] = [];
    let currentCursor: string | undefined = undefined;
    let isComplete = false;

    // 首先清理掉缓存
    await setCachedLinks([]);

    while (!isComplete) {
      try {
        const data: FetchLinksResponse = await fetchLinks(currentCursor);
        allLinks = [...allLinks, ...data.links];
        currentCursor = data.cursor;
        isComplete = !data.cursor || data.list_complete;
      } catch (error) {
        console.error("Error fetching links:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: t.errorFetchingLinks,
          message: String(error),
        });
        isComplete = true;
      }
    }

    setLinks(allLinks);
    await setCachedLinks(allLinks);
    setIsLoading(false);
  }

  useEffect(() => {
    async function loadLinks() {
      const cachedLinks = await getCachedLinks();
      if (cachedLinks && cachedLinks.length > 0) {
        setLinks(cachedLinks);
        setIsLoading(false);
      } else {
        await fetchAllLinks();
      }
    }
    loadLinks();
  }, []);

  return { links, isLoading, refreshLinks: fetchAllLinks, cleanCache };
}
