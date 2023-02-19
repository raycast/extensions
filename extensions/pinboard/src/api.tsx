import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { useFetch } from "@raycast/utils";
import { PinboardBookmark, Bookmark, BookmarksResponse } from "./types";
import { extractDocumentTitle } from "./utils";

const { apiToken, constantTags } = getPreferenceValues();
const apiBasePath = "https://api.pinboard.in/v1";
const allPostsEndpoint = `${apiBasePath}/posts/all`;
const params = new URLSearchParams({ auth_token: apiToken, format: "json" });

export function useSearchConstantsBookmarks() {
  return useFetch<BookmarksResponse>(`${allPostsEndpoint}?${params.toString()}`, {
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = (await response.json()) as PinboardBookmark[];
      if (data !== undefined) {
        const constantTagsData = constantTags?.split(" ");
        if (constantTags.length) {
          const items: Bookmark[] = data.map((post) => transformBookmark(post));
          const filtered = items.filter((tag) => {
            const tagBookmarks = tag.tags?.split(" ");
            return tagBookmarks ? tagBookmarks.some((r) => constantTagsData.includes(r)) : false;
          });

          return { bookmarks: filtered };
        }
      }
      return { bookmarks: [] };
    },
  });
}

export function useSearchBookmarks() {
  return useFetch<BookmarksResponse>(`${allPostsEndpoint}?${params.toString()}`, {
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = (await response.json()) as PinboardBookmark[];
      if (data !== undefined) {
        const items = data.map((post) => transformBookmark(post)) as Bookmark[];

        return { bookmarks: items };
      }
      return { bookmarks: [] };
    },
  });
}

export function transformBookmark(post: PinboardBookmark): Bookmark {
  return {
    id: post.hash as string,
    url: post.href as string,
    title: post.description as string,
    tags: post.tags as string,
    private: (post.shared as string) === "no",
    readLater: (post.toread as string) === "yes",
  };
}

export async function deleteBookmark(bookmark: Bookmark) {
  const params = new URLSearchParams();
  params.append("auth_token", apiToken);
  params.append("url", bookmark.url);

  return await fetch(apiBasePath + "/posts/delete?" + params.toString(), {
    method: "post",
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
  params.append("auth_token", apiToken);

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

export async function loadDocumentTitle(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    return Promise.reject(response.statusText);
  }
  return extractDocumentTitle(await response.text());
}
