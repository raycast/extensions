import path from "node:path";

interface SourceFolderPreference {
  sourceFolder?: string;
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
