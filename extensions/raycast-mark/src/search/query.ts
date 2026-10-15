import { locationValue } from "../bookmark-form.tsx";
import type { Bookmark } from "../model.ts";
import { pinyinKeys } from "./pinyin.ts";

export function hostOf(url: string): string {
  return url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0] || url;
}

export function looksLikeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function textMatches(value: string, query: string): boolean {
  const text = value.toLowerCase();
  if (text.includes(query)) return true;
  const { full, initials } = pinyinKeys(value);
  if (!full) return false;
  return full.includes(query) || initials.includes(query);
}

export function matches(bookmark: Bookmark, needle: string): boolean {
  const query = needle.trim().toLowerCase();
  if (!query) return true;
  return [
    bookmark.title,
    bookmark.url,
    bookmark.desc ?? "",
    ...bookmark.tags,
  ].some((value) => textMatches(value, query));
}

export function inScope(bookmark: Bookmark, scope: string): boolean {
  if (scope === "trash") return bookmark.isDeleted === true;
  if (bookmark.isDeleted === true) return false;
  if (scope === "favorites") return bookmark.pinned === true;
  if (scope === "all" || scope === "recent") return true;
  return bookmark.locations.some((l) => locationValue(l) === scope);
}
