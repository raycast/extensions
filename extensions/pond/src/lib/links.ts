export function saveLink(save: { id: string; libraryId?: string }): string {
  const url = new URL(`pond://item/${encodeURIComponent(save.id)}`);
  if (save.libraryId) url.searchParams.set("library", save.libraryId);
  return url.toString();
}

export function folderLink(id: string): string {
  return `pond://folder/${encodeURIComponent(id)}`;
}

export function viewLink(id: string): string {
  return `pond://view/${encodeURIComponent(id)}`;
}

export function searchLink(query: string): string {
  return `pond://search?q=${encodeURIComponent(query)}`;
}

/** Pond's keyword syntax scopes a quoted phrase to one field. */
export function tagSearchLink(tag: string): string {
  return searchLink(`tags:"${tag.replace(/"/g, "")}"`);
}

export const LIBRARY_LINK = "pond://library";
export const TOKEN_SETTINGS_LINK = "pond://settings/general";
export const DOWNLOAD_URL = "https://github.com/raphaelsalaja/pond/releases/latest";

export function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function markdownLink(title: string, url: string): string {
  return `[${title.replace(/[[\]]/g, "\\$&")}](${url.replace(/\)/g, "%29")})`;
}
