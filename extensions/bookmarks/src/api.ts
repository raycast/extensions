import fetch from "node-fetch";
import { useFetch } from "@raycast/utils";

export type Bookmark = {
  title: string;
  link: string;
  tags?: string;
  description?: string;
};

const bookmarksEndpoint = `https://script.google.com/macros/s/AKfycbxsauO5fYPABhn8oHJADq4olahYm8R1-DwZFek4pTRAytu26h6y6MJK3ZPjtkffl1tPaA/exec`;

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
