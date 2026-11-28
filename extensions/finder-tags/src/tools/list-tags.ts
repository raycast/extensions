import { loadCatalog } from "../lib/service";

/** List Finder tags and file counts in configured folders, sorted by usage. Report any search warnings. */
export default async function tool() {
  const result = await loadCatalog();
  return {
    tags: result.tags.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    countsArePartial: result.countsArePartial,
    warnings: result.warnings,
    failures: result.failures,
  };
}
