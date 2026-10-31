import { getSelectedFinderItems } from "@raycast/api";
import { readFiles, readPalette, writeFiles } from "./native";
import { aggregateTags, canonicalTags, FileBatch, Mutation, TaggedFile } from "./models";
import { expandPath, matchesSearch, SearchInput } from "./query";
import { findPaths, scopes } from "./spotlight";
import { mutateInBatches } from "./operations";
import { recentPaths, rememberWrites } from "./recent-writes";

export async function selectedPaths(): Promise<string[]> {
  try {
    return [...new Set((await getSelectedFinderItems()).map((item) => item.path))];
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read the Finder selection. Select files in Finder and allow Raycast in Privacy & Security → Automation → Finder. ${cause}`,
    );
  }
}

export async function resolvePaths(paths?: string[]): Promise<string[]> {
  const result = paths?.length ? [...new Set(paths.map(expandPath))] : await selectedPaths();
  if (!result.length) throw new Error("No files selected. Select files in Finder or provide their absolute paths.");
  return result;
}

export async function readBatches(paths: string[]): Promise<FileBatch> {
  const result: FileBatch = { files: [], failures: [] };
  for (let i = 0; i < paths.length; i += 200) {
    const batch = await readFiles(paths.slice(i, i + 200));
    result.files.push(...batch.files);
    result.failures.push(...batch.failures);
  }
  return result;
}

export async function loadCatalog() {
  const [palette, search] = await Promise.all([
    readPalette(),
    (async () => {
      try {
        const found = await findPaths({ tags: [], match: "any" });
        const result = await readBatches([...new Set([...found.paths, ...recentPaths(scopes())])]);
        return { ...result, warnings: found.warnings };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return { files: [], failures: [], warnings: [`Could not count tagged files. ${reason}`] };
      }
    })(),
  ]);
  return {
    palette: palette.tags,
    files: search.files,
    tags: aggregateTags(search.files, palette.tags),
    failures: search.failures,
    countsArePartial: search.warnings.length > 0 || search.failures.length > 0,
    warnings: [...search.warnings, ...palette.warnings],
  };
}

export async function searchFiles(input: SearchInput, limit: number) {
  const found = await findPaths(input);
  const candidates = [...new Set([...recentPaths(scopes()), ...found.paths])];
  const result: FileBatch = { files: [], failures: [] };
  // Continue past inaccessible and stale indexed paths so the limit counts current matches.
  let scanned = 0;
  while (scanned < candidates.length && result.files.length < limit) {
    const paths = candidates.slice(scanned, scanned + Math.min(200, limit - result.files.length));
    scanned += paths.length;
    const batch = await readFiles(paths);
    result.files.push(...batch.files.filter((file) => matchesSearch(file, input)));
    result.failures.push(...batch.failures);
  }
  return {
    ...result,
    totalCandidates: candidates.length,
    hasMore: scanned < candidates.length,
    warnings: found.warnings,
  };
}

export async function mutateFiles(
  paths: string[],
  mutation: Mutation,
  onProgress?: (done: number, total: number) => void,
) {
  return mutateInBatches(
    paths,
    mutation,
    async (chunk, change) => {
      const batch = await writeFiles(chunk, change);
      try {
        rememberWrites(batch.files);
      } catch {
        /* A full cache must not turn successful writes into failures. */
      }
      return batch;
    },
    onProgress,
  );
}

export async function canonicalizeForFiles(tags: string[], files: TaggedFile[]) {
  const palette = await readPalette();
  return canonicalTags(tags, [...palette.tags, ...files.flatMap((file) => file.tags)]);
}
