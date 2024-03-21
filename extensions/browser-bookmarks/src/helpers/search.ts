export type Bookmark = {
  id: string;
  title: string;
  url: string;
  folder: string;
  domain?: string;
};

export function fuzzyMatch(item: Bookmark, query: string): boolean {
  const lowerQuery = query.toLowerCase();

  if (fuzzyIncludes(item.title.toLowerCase(), lowerQuery)) {
    return true;
  }

  if (item.domain) {
    // Get subdomains keywords without the suffix (e.g .com)
    const subdomainKeywords = item.domain.split(".").slice(0, -1);
    return subdomainKeywords.some((keyword) => fuzzyIncludes(keyword, lowerQuery));
  }

  if (item.folder) {
    return item.folder
      .toLowerCase()
      .split("/")
      .some((folder) => fuzzyIncludes(folder, lowerQuery));
  }

  return false;
}

function fuzzyIncludes(str: string, query: string): boolean {
  const pattern = query
    .split("")
    .map((char) => `(?=.*${escapeRegExp(char)})`)
    .join("");
  const regex = new RegExp(pattern, "i");
  return regex.test(str);
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
