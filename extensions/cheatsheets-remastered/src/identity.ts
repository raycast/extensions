import type { Library, UserRepository } from "./models";

// Branch names and paths are case-sensitive; GitHub owner/repository names are not.
// Subdirectory filters do not change a file's identity. Branch changes do.
export function repositorySheetId(repo: Pick<UserRepository, "owner" | "name" | "defaultBranch">, filePath: string) {
  return `github:${[repo.owner.toLowerCase(), repo.name.toLowerCase(), repo.defaultBranch, filePath].map(encodeURIComponent).join(":")}`;
}
export function stateKey(type: string, id: string) {
  return `${type}:${id}`;
}

export function migrateIdentities(library: Library): Library {
  const candidates = new Map<string, Set<string>>();
  for (const sheet of library.sheets) {
    const repo = library.repositories.find((r) => r.id === sheet.repositoryId);
    if (!repo) continue; // Keep orphaned cached content recoverable.
    const id = repositorySheetId(repo, sheet.filePath);
    for (const old of [sheet.slug, sheet.id]) {
      const matches = candidates.get(old) ?? new Set<string>();
      matches.add(id);
      candidates.set(old, matches);
    }
    sheet.id = id;
  }
  for (const records of [library.favorites, library.hidden, library.views]) {
    for (const record of records) {
      if (record.type !== "repository" || record.slug.startsWith("github:")) continue;
      const matches = candidates.get(record.slug);
      if (matches?.size === 1) {
        record.slug = [...matches][0];
        if ("key" in record) record.key = stateKey(record.type, record.slug);
      } else {
        library.unresolvedLegacyKeys.push(stateKey(record.type, record.slug));
      }
    }
  }
  library.unresolvedLegacyKeys = [...new Set(library.unresolvedLegacyKeys)];
  return library;
}
