import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { Bookmark, Preferences } from "./types";

interface BookmarksResponse {
  items: Bookmark[];
}

export function faviconUrl(size: number, url: string): string {
  const domain = new URL(url).hostname;
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
}

export function useBookmarksSearch(query: string | undefined): {
  response?: BookmarksResponse;
  error?: string;
  isLoading: boolean;
} {
  const [response, setResponse] = useState<BookmarksResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (cancel) {
        return;
      }

      if (!query) {
        setIsLoading(false);
        setResponse(undefined);
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const preferences: Preferences = getPreferenceValues();

        const url = `https://api.raindrop.io/rest/v1/raindrops/0?search=${
          encodeURIComponent(query) ?? ""
        }`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${preferences.token}`,
          },
        });

        if (!response.ok) {
          setError(response.statusText);
          return;
        }

        const json = await response.json();

        if (!cancel) {
          setResponse(json as BookmarksResponse);
        }
      } catch (e) {
        if (!cancel) {
          setError(String(e));
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { response, error, isLoading };
}

export function useLatestBookmarks(): {
  response?: BookmarksResponse;
  error?: string;
  isLoading: boolean;
} {
  const [response, setResponse] = useState<BookmarksResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const preferences: Preferences = getPreferenceValues();

        const url = "https://api.raindrop.io/rest/v1/raindrops/0";
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${preferences.token}`,
          },
        });

        if (!response.ok) {
          setError(response.statusText);
          return;
        }

        const json = await response.json();

        if (!cancel) {
          setResponse(json as BookmarksResponse);
        }
      } catch (e) {
        if (!cancel) {
          setError(String(e));
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, []);

  return { response, error, isLoading };
}
