import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { useFetch } from "@raycast/utils";

const apiBasePath = "https://api.pinboard.in/v1";

const { apiToken } = getPreferenceValues();

export interface PinboardBookmark {
  href: string;
  description: string;
  extended: string;
  meta: string;
  hash: string;
  time: string;
  shared: "yes" | "no";
  toread: "yes" | "no";
  tags: string;
}

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

export type LastUpdated = {
  update_time: string;
};

export function useSearchBookmarks() {
  const params = new URLSearchParams({ auth_token: apiToken, format: "json" });
  const allPostsEndpoint = `${apiBasePath}/posts/all`;

  return useFetch(`${allPostsEndpoint}?${params.toString()}`, {
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
