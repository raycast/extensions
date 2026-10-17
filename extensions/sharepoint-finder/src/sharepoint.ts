import path from "node:path";

export type SharePointLocation = {
  tenantName: string;
  siteSlug: string;
  libraryName: string;
  relativeSegments: string[];
  serverRelativePath: string;
};

type OpaqueSharePointFile = {
  tenantName: string;
  siteSlug: string;
  fileName: string;
};

export type SharePointTarget =
  | ({ kind: "path" } & SharePointLocation)
  | ({ kind: "shared-file" } & OpaqueSharePointFile);

function decodeRepeatedly(value: string): string {
  let decoded = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function normalizeServerPath(value: string): string {
  const decoded = decodeRepeatedly(value).replaceAll("\\", "/");
  return `/${decoded.split("/").filter(Boolean).join("/")}`;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-z0-9]/gi, "")
    .toLocaleLowerCase();
}

function normalizedWords(value: string): string[] {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function matchesReorderedWords(localName: string, remoteName: string): boolean {
  const words = normalizedWords(localName);
  if (words.length < 2) return false;

  const remoteKey = normalizeName(remoteName);
  if (
    words.reduce((length, word) => length + word.length, 0) !== remoteKey.length
  ) {
    return false;
  }

  function consumesRemoteName(
    remaining: string,
    unusedWords: string[],
  ): boolean {
    if (unusedWords.length === 0) return remaining.length === 0;

    return unusedWords.some((word, index) => {
      if (!remaining.startsWith(word)) return false;
      return consumesRemoteName(remaining.slice(word.length), [
        ...unusedWords.slice(0, index),
        ...unusedWords.slice(index + 1),
      ]);
    });
  }

  return consumesRemoteName(remoteKey, words);
}

function fileNameFromTabTitle(tabTitle: string | undefined): string {
  const match = tabTitle
    ?.trim()
    .match(/^(.+\.[a-z0-9]{1,10})(?:\s+(?:-|–|—|\|)\s+.+)?$/i);
  const fileName = match?.[1].trim();

  if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
    throw new Error(
      "SharePoint did not expose the file name in the browser tab",
    );
  }

  return fileName;
}

function parseOpaqueSharePointFile(
  browserUrl: string,
  tabTitle: string | undefined,
): OpaqueSharePointFile | null {
  const url = new URL(browserUrl);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".sharepoint.com")) {
    return null;
  }

  const match = decodeRepeatedly(url.pathname).match(
    /^\/:([a-z]):\/s\/([^/]+)\/[^/]+\/?$/i,
  );
  if (!match || match[1].toLocaleLowerCase() === "f") return null;

  return {
    tenantName: url.hostname.slice(0, -".sharepoint.com".length),
    siteSlug: match[2],
    fileName: fileNameFromTabTitle(tabTitle),
  };
}

export function parseSharePointTarget(
  browserUrl: string,
  tabTitle: string | undefined,
): SharePointTarget {
  const sharedFile = parseOpaqueSharePointFile(browserUrl, tabTitle);
  if (sharedFile) return { kind: "shared-file", ...sharedFile };

  return { kind: "path", ...parseSharePointLocation(browserUrl) };
}

export function extractServerRelativePath(browserUrl: string): string {
  const url = new URL(browserUrl);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".sharepoint.com")) {
    throw new Error("The active browser tab is not SharePoint");
  }

  for (const key of ["id", "RootFolder", "serverRelativeUrl"]) {
    const value = url.searchParams.get(key);
    if (value?.startsWith("/")) return normalizeServerPath(value);
  }

  const directPath = normalizeServerPath(
    url.pathname.replace(/^\/:\w:\/(?:r|s)\//i, "/"),
  );
  const directSegments = directPath.split("/").filter(Boolean);
  const siteContainerIndex = directSegments.findIndex((segment) =>
    ["sites", "teams"].includes(segment.toLocaleLowerCase()),
  );
  if (
    siteContainerIndex === -1 ||
    directSegments.length < siteContainerIndex + 3
  ) {
    throw new Error(
      "Wait for the shared folder to finish opening, then try again",
    );
  }

  return directPath;
}

export function parseSharePointLocation(
  browserUrl: string,
): SharePointLocation {
  const url = new URL(browserUrl);
  const serverRelativePath = extractServerRelativePath(browserUrl);
  const segments = serverRelativePath.split("/").filter(Boolean);
  const siteContainerIndex = segments.findIndex((segment) =>
    ["sites", "teams"].includes(segment.toLocaleLowerCase()),
  );

  if (siteContainerIndex === -1 || segments.length < siteContainerIndex + 3) {
    throw new Error("SharePoint returned an unfamiliar library path");
  }

  return {
    tenantName: url.hostname.slice(0, -".sharepoint.com".length),
    siteSlug: segments[siteContainerIndex + 1],
    libraryName: segments[siteContainerIndex + 2],
    relativeSegments: segments.slice(siteContainerIndex + 3),
    serverRelativePath,
  };
}

function rankByRemoteName(names: string[], remoteName: string): string[] {
  const remoteKey = normalizeName(remoteName);
  return names
    .map((name) => {
      const localKey = normalizeName(name);
      let score = 0;
      if (localKey === remoteKey) score = 1_000;
      else if (remoteKey.startsWith(localKey)) score = 800 + localKey.length;
      else if (localKey.startsWith(remoteKey)) score = 700 + remoteKey.length;
      return { name, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.name.localeCompare(right.name),
    )
    .map(({ name }) => name);
}

function matchUniqueName(
  names: string[],
  remoteName: string,
  kind: "tenant" | "site" | "library",
  allowReorderedWords = false,
): string[] {
  const uniqueNames = [...new Set(names)];
  const remoteKey = normalizeName(remoteName);
  let matches = uniqueNames.filter((name) => normalizeName(name) === remoteKey);
  if (matches.length === 0 && allowReorderedWords) {
    matches = uniqueNames.filter((name) =>
      matchesReorderedWords(name, remoteName),
    );
  }
  if (matches.length === 0) matches = rankByRemoteName(uniqueNames, remoteName);
  if (matches.length > 1) {
    throw new Error(
      `More than one synced ${kind} matches ${remoteName}: ${matches.join(", ")}. The item was not opened.`,
    );
  }
  return matches;
}

export function rankSharedLibraryRoots(
  directoryNames: string[],
  tenantName: string,
): string[] {
  const prefix = "OneDrive-SharedLibraries-";
  const roots = directoryNames.filter((name) => name.startsWith(prefix));
  return matchUniqueName(
    roots.map((name) => name.slice(prefix.length)),
    tenantName,
    "tenant",
  ).map((name) => `${prefix}${name}`);
}

function localLibrarySuffix(libraryName: string): string {
  return libraryName.toLocaleLowerCase() === "shared documents"
    ? "Documents"
    : libraryName;
}

export function rankLocalLibraries(
  directoryNames: string[],
  location: SharePointLocation,
): string[] {
  const suffix = ` - ${localLibrarySuffix(location.libraryName)}`;
  const matchingNames = directoryNames.filter((name) =>
    name.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase()),
  );
  const siteNames = matchingNames.map((name) => name.slice(0, -suffix.length));
  const [siteName] = matchUniqueName(
    siteNames,
    location.siteSlug,
    "site",
    true,
  );
  if (siteName === undefined) return [];
  const libraries = matchingNames.filter(
    (name) => name.slice(0, -suffix.length) === siteName,
  );
  if (libraries.length > 1) {
    throw new Error(
      `More than one synced library matches ${location.siteSlug}/${location.libraryName}. The item was not opened.`,
    );
  }
  return libraries;
}

type LocalSiteLibraryCandidate = {
  libraryName: string;
  siteName: string;
};

function localSiteLibraryCandidates(
  directoryNames: string[],
): LocalSiteLibraryCandidate[] {
  const delimiter = " - ";
  return directoryNames.flatMap((libraryName) => {
    const candidates: LocalSiteLibraryCandidate[] = [];
    let delimiterIndex = libraryName.indexOf(delimiter);
    while (delimiterIndex > 0) {
      candidates.push({
        libraryName,
        siteName: libraryName.slice(0, delimiterIndex),
      });
      delimiterIndex = libraryName.indexOf(
        delimiter,
        delimiterIndex + delimiter.length,
      );
    }
    return candidates;
  });
}

function uniqueLibraryNames(candidates: LocalSiteLibraryCandidate[]): string[] {
  return [...new Set(candidates.map(({ libraryName }) => libraryName))];
}

export function rankLocalSiteLibraries(
  directoryNames: string[],
  siteSlug: string,
): string[] {
  const candidates = localSiteLibraryCandidates(directoryNames);
  const [siteName] = matchUniqueName(
    candidates.map(({ siteName }) => siteName),
    siteSlug,
    "site",
    true,
  );
  return uniqueLibraryNames(
    candidates.filter((candidate) => candidate.siteName === siteName),
  );
}

function decodeNumericHtmlEntities(segment: string): string {
  return segment.replace(
    /&#(?:x([0-9a-f]+)|([0-9]+));/gi,
    (entity, hex, decimal) => {
      const codePoint = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
      if (
        !Number.isInteger(codePoint) ||
        codePoint < 32 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
        codePoint === 127 ||
        codePoint === 47 ||
        codePoint === 92
      ) {
        return entity;
      }
      return String.fromCodePoint(codePoint);
    },
  );
}

// Try the URL's literal names first. SharePoint sometimes uses numeric HTML
// entities in URLs for names that OneDrive syncs with the actual character.
export function toLocalPaths(
  sharedLibrariesPath: string,
  localLibraryName: string,
  relativeSegments: string[],
): string[] {
  const exactPath = toLocalPath(
    sharedLibrariesPath,
    localLibraryName,
    relativeSegments,
  );
  const decodedSegments = relativeSegments.map(decodeNumericHtmlEntities);
  if (decodedSegments.some((segment) => segment === "." || segment === "..")) {
    return [exactPath];
  }
  const decodedPath = toLocalPath(
    sharedLibrariesPath,
    localLibraryName,
    decodedSegments,
  );
  return decodedPath === exactPath ? [exactPath] : [exactPath, decodedPath];
}

export function toLocalPath(
  sharedLibrariesPath: string,
  localLibraryName: string,
  relativeSegments: string[],
): string {
  const libraryPath = path.resolve(sharedLibrariesPath, localLibraryName);
  const localPath = path.resolve(libraryPath, ...relativeSegments);
  const relativePath = path.relative(libraryPath, localPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("SharePoint returned a path outside the detected library");
  }

  return localPath;
}
