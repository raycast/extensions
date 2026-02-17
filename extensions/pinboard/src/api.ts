import { getPreferenceValues } from "@raycast/api";
import { PinboardBookmark, Bookmark, LastUpdated, Tag } from "./types";

const { apiToken } = getPreferenceValues<Preferences>();
const apiBasePath = "https://api.pinboard.in/v1";

function buildUrl(path: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ auth_token: apiToken, format: "json", ...extra });
  return `${apiBasePath}${path}?${params.toString()}`;
}

export function transformBookmark(post: PinboardBookmark): Bookmark {
  return {
    id: post.hash,
    url: post.href,
    title: post.description,
    description: post.extended,
    tags: post.tags,
    private: post.shared === "no",
    readLater: post.toread === "yes",
  };
}

export async function fetchAllBookmarks(): Promise<Bookmark[]> {
  const response = await fetch(buildUrl("/posts/all"));
  if (!response.ok) throw new Error(response.statusText);

  const data = (await response.json()) as PinboardBookmark[];
  return data.map(transformBookmark);
}

export async function fetchLastUpdated(): Promise<string> {
  const response = await fetch(buildUrl("/posts/update"));
  if (!response.ok) throw new Error(response.statusText);

  const data = (await response.json()) as LastUpdated;
  return data.update_time;
}

export async function deleteBookmark(bookmark: Bookmark): Promise<void> {
  const response = await fetch(buildUrl("/posts/delete", { url: bookmark.url }), { method: "post" });
  if (!response.ok) throw new Error(response.statusText);
}

export async function addBookmark(bookmark: Bookmark): Promise<unknown> {
  const response = await fetch(
    buildUrl("/posts/add", {
      url: bookmark.url,
      description: bookmark.title ?? "New Bookmark",
      tags: bookmark.tags ?? "",
      shared: bookmark.private ? "no" : "yes",
      toread: bookmark.readLater ? "yes" : "no",
    }),
    { method: "post" },
  );

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const result = (await response.json()) as Record<string, unknown>;
  if (result?.result_code !== "done") {
    return Promise.reject(result?.result_code ?? "Response Error");
  }

  return result;
}

export async function fetchTags(): Promise<Tag[]> {
  const response = await fetch(buildUrl("/tags/get"));
  if (!response.ok) throw new Error(response.statusText);

  const data = (await response.json()) as Record<string, string>;
  return Object.entries(data)
    .map(([name, count]) => ({ name, count: parseInt(count, 10) }))
    .sort((a, b) => b.count - a.count);
}
