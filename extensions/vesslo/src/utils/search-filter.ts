import { VessloApp } from "../types";
import { installedApps } from "./app-policy";
import { displayText } from "./display-format";

export type SearchScope =
  | "all"
  | "name"
  | "bundleId"
  | "developer"
  | "tag"
  | "memo";
type SearchField = Exclude<SearchScope, "all">;

export interface SearchResult {
  app: VessloApp;
  matchedFields: SearchField[];
  matchDescription?: string;
}

export function memoExcerpt(memo: string, query: string, limit = 120): string {
  const compact = displayText(memo, Math.max(memo.length, 1));
  const characters = Array.from(compact);
  const safeLimit = Math.max(8, Math.floor(limit));
  if (characters.length <= safeLimit) return compact;
  const match = compact
    .toLowerCase()
    .indexOf(query.replace(/\s+/g, " ").toLowerCase().trim());
  const matchOffset =
    match < 0 ? 0 : Array.from(compact.slice(0, match)).length;
  const start = Math.max(0, matchOffset - Math.floor(safeLimit / 3));
  const budget = safeLimit - (start > 0 ? 1 : 0);
  const hasTail = start + budget < characters.length;
  const excerpt = characters
    .slice(start, start + budget - (hasTail ? 1 : 0))
    .join("");
  return `${start > 0 ? "…" : ""}${excerpt}${hasTail ? "…" : ""}`;
}

export function searchApps(
  apps: VessloApp[],
  searchText: string,
  scope: SearchScope = "all",
): SearchResult[] {
  const query = searchText.trim().toLowerCase();
  return installedApps(apps).flatMap<SearchResult>((app) => {
    if (!query) return [{ app, matchedFields: [] }];
    const fields: Record<SearchField, string[]> = {
      name: [app.name],
      bundleId: [app.bundleId ?? ""],
      developer: [app.developer ?? ""],
      tag: app.tags,
      memo: [app.memo ?? ""],
    };
    const matchedFields = (Object.keys(fields) as SearchField[]).filter(
      (field) =>
        (scope === "all" || scope === field) &&
        fields[field].some((value) => value.toLowerCase().includes(query)),
    );
    if (matchedFields.length === 0) return [];
    const descriptions: Record<SearchField, string> = {
      name: `Name: ${memoExcerpt(app.name, query, 60)}`,
      bundleId: `Bundle ID: ${memoExcerpt(app.bundleId ?? "", query, 80)}`,
      developer: `Developer: ${memoExcerpt(app.developer ?? "", query, 60)}`,
      tag: `Tag: ${memoExcerpt(
        app.tags
          .filter((tag) => tag.toLowerCase().includes(query))
          .map((tag) => `#${tag}`)
          .join(", "),
        query,
        80,
      )}`,
      memo: `Memo: ${memoExcerpt(app.memo ?? "", query)}`,
    };
    const matchDescription = matchedFields
      .map((field) => descriptions[field])
      .join(" · ");
    return [
      {
        app,
        matchedFields,
        matchDescription,
      },
    ];
  });
}
