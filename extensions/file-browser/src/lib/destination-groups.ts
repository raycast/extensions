import { existsSync, lstatSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, normalize, relative } from "node:path";
import { isNavigableDirectory } from "$lib/item-behavior";
import type { Item } from "$lib/types";

export type Destination = {
  label: string;
  path: string;
};

export type DestinationGroup = {
  key: "favorites" | "current-folder";
  title: string;
  destinations: Destination[];
};

type BuildCopyMoveDestinationGroupsParams = {
  mode: "copy" | "move";
  sourcePath: string;
  sourceType: Item["type"];
  siblingDirectories: Item[];
};

type CommonFolderDefinition = {
  label: string;
  getPath: () => string;
};

const COMMON_FOLDER_DEFINITIONS: CommonFolderDefinition[] = [
  { label: "Home", getPath: homedir },
  { label: "Desktop", getPath: () => join(homedir(), "Desktop") },
  { label: "Documents", getPath: () => join(homedir(), "Documents") },
  { label: "Downloads", getPath: () => join(homedir(), "Downloads") },
  { label: "Pictures", getPath: () => join(homedir(), "Pictures") },
  { label: "Movies", getPath: () => join(homedir(), "Movies") },
  { label: "Music", getPath: () => join(homedir(), "Music") },
];

function normalizePath(path: string): string {
  return normalize(path);
}

function isExistingDirectory(path: string): boolean {
  try {
    return existsSync(path) && lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isDescendantPath(candidatePath: string, sourcePath: string): boolean {
  const relativePath = relative(sourcePath, candidatePath);
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

export function isInvalidDestination(
  destinationPath: string,
  sourcePath: string,
  sourceType: Item["type"],
  mode: "copy" | "move",
): boolean {
  const normalizedDestination = normalizePath(destinationPath);
  const normalizedSourcePath = normalizePath(sourcePath);
  const sourceParent = dirname(normalizedSourcePath);

  if (normalizedDestination === sourceParent) return true;
  if (normalizedDestination === normalizedSourcePath) return true;
  if (sourceType === "directory" && mode === "move" && isDescendantPath(normalizedDestination, normalizedSourcePath)) {
    return true;
  }

  return false;
}

function addDestination(
  destinations: Destination[],
  seenPaths: Set<string>,
  destination: Destination,
  sourcePath: string,
  sourceType: Item["type"],
  mode: "copy" | "move",
): void {
  const normalizedPath = normalizePath(destination.path);

  if (seenPaths.has(normalizedPath)) return;
  if (isInvalidDestination(normalizedPath, sourcePath, sourceType, mode)) return;

  seenPaths.add(normalizedPath);
  destinations.push({
    ...destination,
    path: normalizedPath,
  });
}

function buildCommonFolderDestinations(
  sourcePath: string,
  sourceType: Item["type"],
  mode: "copy" | "move",
): Destination[] {
  const destinations: Destination[] = [];
  const seenPaths = new Set<string>();

  for (const definition of COMMON_FOLDER_DEFINITIONS) {
    const path = definition.getPath();
    if (!isExistingDirectory(path)) continue;

    addDestination(destinations, seenPaths, { label: definition.label, path }, sourcePath, sourceType, mode);
  }

  return destinations;
}

function buildParentAndSiblingDestinations(
  sourcePath: string,
  sourceType: Item["type"],
  mode: "copy" | "move",
  siblingDirectories: Item[],
): Destination[] {
  const destinations: Destination[] = [];
  const seenPaths = new Set<string>();
  const sourceParent = dirname(normalizePath(sourcePath));
  const parentDestinationPath = normalizePath(dirname(sourceParent));

  addDestination(
    destinations,
    seenPaths,
    { label: "Parent Folder", path: parentDestinationPath },
    sourcePath,
    sourceType,
    mode,
  );

  for (const siblingDirectory of siblingDirectories) {
    if (!isNavigableDirectory(siblingDirectory)) continue;

    addDestination(
      destinations,
      seenPaths,
      {
        label: siblingDirectory.name,
        path: siblingDirectory.path,
      },
      sourcePath,
      sourceType,
      mode,
    );
  }

  return destinations;
}

export function buildCopyMoveDestinationGroups({
  mode,
  sourcePath,
  sourceType,
  siblingDirectories,
}: BuildCopyMoveDestinationGroupsParams): DestinationGroup[] {
  return [
    {
      key: "favorites",
      title: "Common Folders",
      destinations: buildCommonFolderDestinations(sourcePath, sourceType, mode),
    },
    {
      key: "current-folder",
      title: "Parent & Sibling Folders",
      destinations: buildParentAndSiblingDestinations(sourcePath, sourceType, mode, siblingDirectories),
    },
  ];
}
