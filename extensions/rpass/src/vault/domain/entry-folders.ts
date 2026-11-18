function pathParts(entry: string): string[] {
  return entry
    .replace(/\\/g, "/")
    .replace(/\.gpg$/i, "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getEntryParentFolders(entries: string[]): string[] {
  const folders = new Set<string>();

  for (const entry of entries) {
    const parts = pathParts(entry);
    for (let depth = 1; depth < parts.length; depth += 1) {
      folders.add(parts.slice(0, depth).join("/"));
    }
  }

  return Array.from(folders).sort((a, b) => a.localeCompare(b));
}
