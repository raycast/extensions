import MiniSearch, { SearchOptions, SearchResult } from "minisearch";
import { GistRecord, SearchDocument } from "./types";

export type SearchIndexBundle = {
  miniSearch: MiniSearch<SearchDocument>;
  byGistId: Map<string, GistRecord>;
};

export function buildSearchDocuments(gists: GistRecord[]): SearchDocument[] {
  return gists.map((gist) => ({
    id: gist.id,
    gistId: gist.id,
    description: gist.description,
    filenamesText: gist.files.map((file) => file.filename).join(" "),
    contentText: gist.files
      .map((file) => file.content ?? "")
      .filter(Boolean)
      .join("\n\n"),
    public: gist.public,
    updatedAt: gist.updatedAt,
    fileCount: gist.files.length,
    filenames: gist.files.map((file) => file.filename),
  }));
}

export function createSearchIndex(
  documents: SearchDocument[],
  gists: GistRecord[],
): SearchIndexBundle {
  const miniSearch = new MiniSearch<SearchDocument>({
    fields: ["filenamesText", "description", "contentText"],
    storeFields: [
      "gistId",
      "description",
      "updatedAt",
      "public",
      "fileCount",
      "filenames",
    ],
    searchOptions: defaultSearchOptions(),
  });

  miniSearch.addAll(documents);

  return {
    miniSearch,
    byGistId: new Map(gists.map((gist) => [gist.id, gist])),
  };
}

function defaultSearchOptions(): SearchOptions {
  return {
    boost: {
      filenamesText: 5,
      description: 3,
      contentText: 1,
    },
    prefix: true,
    fuzzy: 0.2,
    combineWith: "OR",
  };
}

export function searchDocuments(
  bundle: SearchIndexBundle,
  query: string,
): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  return bundle.miniSearch
    .search(trimmed, defaultSearchOptions())
    .sort((left, right) => {
      const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const leftUpdatedAt =
        typeof left.updatedAt === "string" ? left.updatedAt : "";
      const rightUpdatedAt =
        typeof right.updatedAt === "string" ? right.updatedAt : "";
      return rightUpdatedAt.localeCompare(leftUpdatedAt);
    });
}

export function sortRecentGists(gists: GistRecord[]): GistRecord[] {
  return [...gists].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}
