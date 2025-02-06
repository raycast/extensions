import fetch from "node-fetch";
import { useFetch } from "@raycast/utils";

export type Bookmark = {
  title: string;
  link: string;
  tags?: string;
  description?: string;
};

const bookmarksEndpoint = `https://script.google.com/macros/s/AKfycbweue510w3txm4qOxzmB09PqE25PQ8-ABWi6eH7XATq-P-cuSrmk29gScHRsLqBUVabUQ/exec`;

export async function createBookmark(title: string, link: string, tags?: string, description?: string) {
  const response = await fetch(bookmarksEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, link, tags, description, action: "create" }),
  });

  if (!response.ok) {
    throw Error(`${response.statusText} (HTTP ${response.status})`);
  }
}

export async function updateBookmark(
  bookmark: Bookmark,
  change: { title?: string; link?: string; tags?: string; description?: string },
) {
  const updatedBookmark = {
    ...bookmark,
    ...change,
  };

  const response = await fetch(`${bookmarksEndpoint}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...updatedBookmark, action: "update" }),
  });

  if (!response.ok) {
    throw Error(`${response.statusText} (HTTP ${response.status})`);
  }
}

export async function deleteBookmark(bookmark: Bookmark) {
  const response = await fetch(`${bookmarksEndpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...bookmark, action: "delete" }),
  });

  if (!response.ok) {
    throw Error(`${response.statusText} (HTTP ${response.status})`);
  }
}

export function useBookmarks() {
  return useFetch<Bookmark[]>(bookmarksEndpoint);
}

export function useBookmark(bookmark: Bookmark) {
  return useFetch<Bookmark, Bookmark>(`${bookmarksEndpoint}`, { initialData: bookmark });
}
