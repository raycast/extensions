import { promises as fs } from "node:fs";
import path from "node:path";
import { Diagnostic, LoadResult, ReferenceRecord } from "./model";
import { parseReferenceYaml } from "./parser";

async function findYamlFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.isSymbolicLink())
      .map(async (entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return findYamlFiles(fullPath);
        return /\.ya?ml$/i.test(entry.name) ? [fullPath] : [];
      }),
  );
  return nested.flat().sort((a, b) => a.localeCompare(b));
}

export async function loadReferenceDirectory(directory: string): Promise<LoadResult> {
  const diagnostics: Diagnostic[] = [];
  const accepted = new Map<string, ReferenceRecord>();
  const conflicted = new Set<string>();
  let files: string[];
  try {
    files = await findYamlFiles(directory);
  } catch (error) {
    return {
      records: [],
      diagnostics: [
        {
          source: directory,
          message: error instanceof Error ? error.message : "Unable to read directory",
        },
      ],
    };
  }

  for (const file of files) {
    try {
      const parsed = parseReferenceYaml(await fs.readFile(file, "utf8"), file);
      diagnostics.push(...parsed.diagnostics);
      for (const record of parsed.records) {
        const key = `${record.collection}\u0000${record.name}`;
        const previous = accepted.get(key);
        if (previous || conflicted.has(key)) {
          accepted.delete(key);
          conflicted.add(key);
          diagnostics.push({
            source: file,
            collection: record.collection,
            record: record.name,
            message: previous
              ? `Conflicts with the same collection/record in ${previous.source}; neither record was loaded`
              : "Conflicts with the same collection/record in another file; this record was not loaded",
          });
        } else {
          accepted.set(key, record);
        }
      }
    } catch (error) {
      diagnostics.push({
        source: file,
        message: error instanceof Error ? error.message : "Unable to read file",
      });
    }
  }
  return { records: [...accepted.values()], diagnostics };
}
