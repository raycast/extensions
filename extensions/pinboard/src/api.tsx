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

export function useSearchBookmarks() {
  const [state, setState] = useState<{ bookmarks: Bookmark[]; isLoading: boolean }>({ bookmarks: [], isLoading: true });
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
      const bookmarks = await searchBookmarks(searchText, cancel.current.signal);
      setState((oldState) => ({
        ...oldState,
        bookmarks: bookmarks,
        isLoading: false,
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

  return response.json();
}

async function searchBookmarks(searchText: string, signal: AbortSignal): Promise<Bookmark[]> {
  const path = searchText.length === 0 ? "/posts/recent" : "/posts/all";

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
