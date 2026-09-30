import { readdir } from "fs/promises";
import { resolve } from "path";

// Search the complete stored content before the list query truncates previews.
export function searchCondition(searchText: string) {
  const terms = searchText.trim().split(/\s+/).filter(Boolean);
  return terms
    .map((term) => {
      const literal = term.replaceAll("'", "''");
      return `AND (instr(lower(coalesce(Title, '')), lower('${literal}')) > 0 OR instr(lower(coalesce(Content, '')), lower('${literal}')) > 0)`;
    })
    .join(" ");
}

async function directories(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function findSearchIndexes(home: string): Promise<string[]> {
  const containersPath = resolve(home, "Library/Containers");
  const containers = await directories(containersPath);
  const candidates = new Set(["com.microsoft.onenote.mac"]);
  for (const container of containers) {
    if (container.isDirectory() && /^[0-9a-f-]{36}$/i.test(container.name)) candidates.add(container.name);
  }
  const indexes: string[] = [];
  for (const container of candidates) {
    const oneNotePath = resolve(
      containersPath,
      container,
      "Data/Library/Application Support/Microsoft User Data/OneNote"
    );
    for (const version of await directories(oneNotePath)) {
      if (!version.isDirectory()) continue;
      const indexPath = resolve(oneNotePath, version.name, "FullTextSearchIndex");
      if ((await directories(indexPath)).some((file) => file.isFile() && file.name.endsWith(".db"))) {
        indexes.push(indexPath);
      }
    }
  }
  if (indexes.length === 0) {
    throw new Error(
      "OneNote's local search index was not found. Install and open OneNote, sign in, and sync your notebooks, then retry."
    );
  }
  return indexes;
}
