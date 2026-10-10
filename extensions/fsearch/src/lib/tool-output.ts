import { SearchResult } from "./fsearch";

/** Compact, JSON-friendly shape for AI tools. */
export function formatForAI(result: SearchResult) {
  switch (result.type) {
    case "names":
      return {
        results: result.hits.map((hit) => ({
          path: hit.path,
          kind: hit.kind,
          sizeBytes: hit.size,
          modified: hit.mtime.toISOString(),
        })),
      };
    case "content":
      return {
        files: result.files,
        complete: result.complete,
        ...(result.indexing ? { note: "The content index is still building; some files may be missing." } : {}),
      };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
