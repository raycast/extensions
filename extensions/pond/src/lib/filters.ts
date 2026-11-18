import type { ApiLibraryQueryInput, ApiView } from "pond-api";

export type Filter =
  | { kind: "all" }
  | { kind: "trash" }
  | { kind: "untagged" }
  | { kind: "unfiled" }
  | { kind: "source"; source: string }
  | { kind: "folder"; id: string }
  | { kind: "tag"; name: string }
  | { kind: "view"; id: string }
  | { kind: "media"; types: string[] };

export const ALL_SAVES: Filter = { kind: "all" };

export function encodeFilter(filter: Filter): string {
  switch (filter.kind) {
    case "source":
      return `source:${filter.source}`;
    case "folder":
      return `folder:${filter.id}`;
    case "tag":
      return `tag:${filter.name}`;
    case "view":
      return `view:${filter.id}`;
    case "media":
      return `media:${filter.types.join(",")}`;
    default:
      return filter.kind;
  }
}

export function decodeFilter(value: string | undefined): Filter {
  if (!value) return ALL_SAVES;
  const split = value.indexOf(":");
  const kind = split === -1 ? value : value.slice(0, split);
  const rest = split === -1 ? "" : value.slice(split + 1);
  if (kind === "trash" || kind === "untagged" || kind === "unfiled") return { kind };
  if (!rest) return ALL_SAVES;
  if (kind === "source") return { kind, source: rest };
  if (kind === "folder") return { kind, id: rest };
  if (kind === "tag") return { kind, name: rest };
  if (kind === "view") return { kind, id: rest };
  if (kind === "media") return { kind, types: rest.split(",").filter(Boolean) };
  return ALL_SAVES;
}

/** Resolves `null` while a saved view's definition hasn't loaded yet. */
export function queryFor(filter: Filter, keywords: string, views?: readonly ApiView[]): ApiLibraryQueryInput | null {
  const base: ApiLibraryQueryInput = {
    keywords: keywords.trim() || undefined,
    sortKey: "savedAt",
    sortDir: "desc",
    include: ["saves"],
  };
  switch (filter.kind) {
    case "all":
      return base;
    case "trash":
      return { ...base, scope: { deletedOnly: true } };
    case "untagged":
      return { ...base, scope: { untagged: true } };
    case "unfiled":
      return { ...base, scope: { uncategorized: true } };
    case "source":
      return { ...base, scope: { source: filter.source } };
    case "folder":
      return { ...base, scope: { folderIds: [filter.id] } };
    case "tag":
      return { ...base, scope: { tag: filter.name } };
    case "media":
      return {
        ...base,
        query: { combinator: "and", rules: [{ field: "type", operator: "in", value: filter.types }] },
      };
    case "view": {
      const view = views?.find((item) => item.id === filter.id);
      if (!view) return null;
      return { ...base, query: view.query, sortKey: view.sortKey, sortDir: view.sortDir };
    }
  }
}

export function groupsByDay(input: ApiLibraryQueryInput): boolean {
  return input.sortKey === "savedAt" && input.sortDir === "desc";
}
