import { basename } from "node:path";

import { findDuplicateFields, normalizeDirectoryPath, type Destination } from "./destination";

export interface FinderFolderDefaults {
  copy: boolean;
  move: boolean;
  pinned: boolean;
}

export type FinderFolderImportStatus = "valid" | "duplicate" | "not-folder";

export interface FinderFolderImportItem {
  sourceIndex: number;
  sourceLabel: string;
  path: string;
  status: FinderFolderImportStatus;
  messages: string[];
  destination?: Destination;
}

export interface FinderFolderImportPreview {
  items: FinderFolderImportItem[];
}

export interface FinderFolderImportCounts {
  valid: number;
  duplicate: number;
  notFolder: number;
}

export async function buildFinderFolderImportPreview(
  paths: readonly string[],
  existing: readonly Destination[],
  isDirectory: (path: string) => Promise<boolean>,
  defaults: FinderFolderDefaults,
): Promise<FinderFolderImportPreview> {
  const normalizedPaths = paths.map((path) => normalizeDirectoryPath(path));
  const directoryChecks = await Promise.all(normalizedPaths.map(isDirectory));
  const seenPaths = new Set<string>();
  const existingPaths = new Set(existing.map((destination) => pathKey(destination.path)));
  const items: FinderFolderImportItem[] = normalizedPaths.map((path, index) => {
    const sourceIndex = index + 1;
    const sourceLabel = `Finder selection ${sourceIndex}`;
    const key = pathKey(path);

    if (!directoryChecks[index]) {
      return {
        sourceIndex,
        sourceLabel,
        path,
        status: "not-folder",
        messages: ["Selected item is not an accessible folder."],
      };
    }
    if (seenPaths.has(key)) {
      return {
        sourceIndex,
        sourceLabel,
        path,
        status: "duplicate",
        messages: ["The same folder was selected more than once."],
      };
    }
    seenPaths.add(key);
    if (existingPaths.has(key)) {
      return {
        sourceIndex,
        sourceLabel,
        path,
        status: "duplicate",
        messages: ["Folder is already saved as a destination."],
      };
    }

    return { sourceIndex, sourceLabel, path, status: "valid", messages: [] };
  });

  const usedNames = new Set(existing.map((destination) => destination.name.toLocaleLowerCase()));
  const usedIds = new Set(existing.map((destination) => destination.id));
  const candidates = items
    .filter((item) => item.status === "valid")
    .sort((left, right) => left.path.localeCompare(right.path));

  for (const item of candidates) {
    const folderName = basename(item.path) || item.path;
    const destination: Destination = {
      id: uniqueId(folderName, usedIds),
      name: uniqueName(folderName, usedNames),
      path: item.path,
      keywords: [folderName],
      ...defaults,
    };
    const duplicateFields = findDuplicateFields(destination, existing);
    if (duplicateFields.length > 0) {
      item.status = "duplicate";
      item.messages = [`Duplicates saved ${duplicateFields.join(", ")}.`];
      continue;
    }
    item.destination = destination;
  }

  return { items };
}

export function countFinderFolderImportStatuses(preview: FinderFolderImportPreview): FinderFolderImportCounts {
  return preview.items.reduce<FinderFolderImportCounts>(
    (counts, item) => {
      if (item.status === "not-folder") {
        counts.notFolder += 1;
      } else {
        counts[item.status] += 1;
      }
      return counts;
    },
    { valid: 0, duplicate: 0, notFolder: 0 },
  );
}

export function finderFolderImportDestinations(preview: FinderFolderImportPreview): Destination[] {
  return preview.items.flatMap((item) => (item.status === "valid" && item.destination ? [item.destination] : []));
}

function uniqueName(folderName: string, usedNames: Set<string>): string {
  let candidate = folderName;
  let suffix = 2;
  while (usedNames.has(candidate.toLocaleLowerCase())) {
    candidate = `${folderName} (${suffix})`;
    suffix += 1;
  }
  usedNames.add(candidate.toLocaleLowerCase());
  return candidate;
}

function uniqueId(folderName: string, usedIds: Set<string>): string {
  const base = slugify(folderName);
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "folder";
}

function pathKey(path: string): string {
  return normalizeDirectoryPath(path).toLocaleLowerCase();
}
