export type FdIndexType = "all" | "directory" | "file";

export type ParsedSearch = {
  query: string;
  indexType: FdIndexType;
  hasDirectives: boolean;
};

const DIRECTORY_DIRECTIVE = /^(?:\^|-)(?:d|dir|directory)$/i;
const FILE_DIRECTIVE = /^(?:\^|-)(?:f|file)$/i;

export function parseSearchQuery(searchText: string, ignoreSpacesInSearch: boolean, homeDir: string): ParsedSearch {
  const keys = searchText.trim().split(/\s+/).filter(Boolean);
  let indexType: FdIndexType = "all";
  let hasDirectives = false;
  const queryParts: string[] = [];

  for (const key of keys) {
    if (DIRECTORY_DIRECTIVE.test(key)) {
      indexType = "directory";
      hasDirectives = true;
    } else if (FILE_DIRECTIVE.test(key)) {
      indexType = "file";
      hasDirectives = true;
    } else {
      queryParts.push(key);
    }
  }

  let query = queryParts.join(" ");
  if (ignoreSpacesInSearch) {
    query = query.replaceAll(" ", "");
  }
  query = query.replaceAll("~", homeDir);

  return { query, indexType, hasDirectives };
}
