import { preferences, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

const apiBasePath = "https://api.pinboard.in/v1";

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  tags?: string;
  private: boolean;
  readLater: boolean;
}

export interface BookmarksState {
  bookmarks: Bookmark[];
  isLoading: boolean;
  title: string;
}

export enum SearchKind {
  Constant,
  All,
}

export function useSearchBookmarks(searchKind: SearchKind) {
  const [state, setState] = useState<BookmarksState>({ bookmarks: [], isLoading: true, title: "" });
  const cancel = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancel.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    cancel.current?.abort();
    cancel.current = new AbortController();
    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      let bookmarks: Bookmark[];
      switch (searchKind) {
        case SearchKind.All:
          bookmarks = await searchBookmarks(searchText, searchKind, cancel.current.signal);
          break;
        case SearchKind.Constant:
          bookmarks = await searchBookmarks(
            searchText + " " + preferences.constantTags.value,
            searchKind,
            cancel.current.signal
          );
          break;
      }

      setState((oldState) => ({
        ...oldState,
        bookmarks: bookmarks,
        isLoading: false,
        title: searchKind === SearchKind.All && searchText.length === 0 ? "Recent Bookmarks" : "Found Bookmarks",
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      console.error("searchBookmarks error", error);
      showToast(ToastStyle.Failure, "Could not search bookmarks", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function searchBookmarks(searchText: string, kind: SearchKind, signal: AbortSignal): Promise<Bookmark[]> {
  const path = kind == SearchKind.All && searchText.length === 0 ? "/posts/recent" : "/posts/all";

  const params = new URLSearchParams();
  if (searchText.length > 0) {
    params.append("tag", searchText);
    params.append("results", "100");
  }
  params.append("format", "json");
  params.append("auth_token", preferences.apiToken.value as string);

  const response = await fetch(apiBasePath + path + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const posts = (json?.posts ?? json) as Record<string, unknown>[];
  return posts.map((post) => {
    return {
      id: post.hash as string,
      url: post.href as string,
      title: post.description as string,
      tags: post.tags as string,
      private: (post.shared as string) === "no",
      readLater: (post.toread as string) === "yes",
    };
  });
}

export async function addBookmark(bookmark: Bookmark): Promise<unknown> {
  const params = new URLSearchParams();
  params.append("url", bookmark.url);
  params.append("description", bookmark.title ?? "New Bookmark");
  params.append("tags", bookmark.tags ?? "");
  params.append("shared", bookmark.private ? "no" : "yes");
  params.append("toread", bookmark.readLater ? "yes" : "no");
  params.append("format", "json");
  params.append("auth_token", preferences.apiToken.value as string);

  const response = await fetch(apiBasePath + "/posts/add?" + params.toString(), {
    method: "post",
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const result = (await response.json()) as Record<string, unknown>;
  if (result?.result_code !== "done") {
    return Promise.reject(result?.result_code ?? "Response Error");
  }

  return result;
}
