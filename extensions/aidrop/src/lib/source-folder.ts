import path from "node:path";

interface SourceFolderPreference {
  sourceFolder?: string;
}

interface SourceFolderPreferences {
  sourceFolder?: string;
  sourceFolder2?: string;
  sourceFolder3?: string;
}

export function getSourceFolderPath(
  preferences: SourceFolderPreference,
  homeDirectory: string,
): string {
  const preferredPath = preferences.sourceFolder?.trim();

  if (!preferredPath) {
    return path.join(homeDirectory, "Downloads");
  }

  if (preferredPath === "~") {
    return homeDirectory;
  }

  if (preferredPath.startsWith("~/")) {
    return path.join(homeDirectory, preferredPath.slice(2));
  }

  return preferredPath;
}

export function getSourceFolderPaths(
  preferences: SourceFolderPreferences,
  homeDirectory: string,
): string[] {
  const rawPaths = [
    preferences.sourceFolder,
    preferences.sourceFolder2,
    preferences.sourceFolder3,
  ];

  const resolved = rawPaths
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p))
    .map((p) => getSourceFolderPath({ sourceFolder: p }, homeDirectory));

  const unique = [...new Set(resolved)];

  if (unique.length === 0) {
    return [path.join(homeDirectory, "Downloads")];
  }

  return unique;
}
