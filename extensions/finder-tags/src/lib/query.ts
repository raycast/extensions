import { homedir } from "node:os";
import { isAbsolute, normalize, relative } from "node:path";
import { Match, matchesTags, normalizeTags, TaggedFile } from "./models";

export type SearchInput = {
  tags: string[];
  match: Match;
  modifiedAfter?: string;
  modifiedBefore?: string;
  kind?: string;
};

export function expandPath(path: string): string {
  const expanded = path === "~" ? homedir() : path.startsWith("~/") ? homedir() + path.slice(1) : path;
  if (!isAbsolute(expanded) || expanded.includes("\0")) throw new Error(`Use an absolute folder or file path: ${path}`);
  return normalize(expanded);
}

export function isWithin(path: string, scope: string): boolean {
  const subpath = relative(scope, path);
  return subpath === "" || (!subpath.startsWith("../") && subpath !== ".." && !isAbsolute(subpath));
}

export function searchScopes(scope: string, extra: string): string[] {
  const folders = [
    ...new Set(
      [scope || "~", ...extra.split(/[\n;]/).filter((path) => path.trim())].map((path) => expandPath(path.trim())),
    ),
  ];
  return folders.filter((folder, i) => !folders.some((other, j) => i !== j && isWithin(folder, other)));
}

export function quoteSpotlight(value: string): string {
  if (/\p{Cc}/u.test(value)) throw new Error("Search values cannot contain control characters.");
  return `"${value.replace(/[\\"*?]/g, "\\$&")}"`;
}

export function dateFilter(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error("Use an ISO 8601 date, for example 2026-03-01.");
  }
  return `$time.iso(${quoteSpotlight(new Date(value).toISOString())})`;
}

export const kindTypes: Record<string, string> = {
  pdf: "com.adobe.pdf",
  image: "public.image",
  audio: "public.audio",
  video: "public.movie",
  movie: "public.movie",
  folder: "public.folder",
  document: "public.content",
  text: "public.text",
};

export function matchesSearch(file: TaggedFile, input: SearchInput): boolean {
  if (!matchesTags(file, input.tags, input.match)) return false;
  if (input.modifiedAfter && (!file.modifiedAt || Date.parse(file.modifiedAt) < Date.parse(input.modifiedAfter)))
    return false;
  if (input.modifiedBefore && (!file.modifiedAt || Date.parse(file.modifiedAt) >= Date.parse(input.modifiedBefore)))
    return false;
  if (input.kind) {
    const kind = input.kind.toLowerCase().replace(/^\./, "");
    const uti = kindTypes[kind];
    if (uti ? !file.contentTypes.includes(uti) : !file.name.toLowerCase().endsWith(`.${kind}`)) return false;
  }
  return true;
}

export function spotlightQuery(input: SearchInput): string {
  const tags = normalizeTags(input.tags);
  const clauses = tags.map((tag) => `kMDItemUserTags == ${quoteSpotlight(tag)}c`);
  const filters = [
    clauses.length ? `(${clauses.join(input.match === "all" ? " && " : " || ")})` : 'kMDItemUserTags == "*"',
  ];
  if (input.kind) {
    const kind = input.kind.toLowerCase().replace(/^\./, "");
    const uti = kindTypes[kind];
    if (uti) filters.push(`kMDItemContentTypeTree == ${quoteSpotlight(uti)}`);
    else if (/^[a-z0-9]+$/.test(kind)) filters.push(`kMDItemFSName == "*.${kind}"c`);
    else throw new Error("Kind must be pdf, image, audio, video, folder, document, text, or a file extension.");
  }
  if (input.modifiedAfter) filters.push(`kMDItemFSContentChangeDate >= ${dateFilter(input.modifiedAfter)}`);
  if (input.modifiedBefore) filters.push(`kMDItemFSContentChangeDate < ${dateFilter(input.modifiedBefore)}`);
  if (
    input.modifiedAfter &&
    input.modifiedBefore &&
    Date.parse(input.modifiedAfter) >= Date.parse(input.modifiedBefore)
  ) {
    throw new Error("modifiedBefore must be later than modifiedAfter.");
  }
  return filters.join(" && ");
}
