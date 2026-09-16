import path from "node:path";

export type SharePointLocation = {
  tenantName: string;
  siteSlug: string;
  libraryName: string;
  relativeSegments: string[];
  serverRelativePath: string;
};

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
  if (!directPath.toLocaleLowerCase().includes("/shared documents/")) {
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
    .sort(
      (left, right) =>
        right.score - left.score || left.name.localeCompare(right.name),
    )
    .map(({ name }) => name);
}

export function rankSharedLibraryRoots(
  directoryNames: string[],
  tenantName: string,
): string[] {
  const prefix = "OneDrive-SharedLibraries-";
  const roots = directoryNames.filter((name) => name.startsWith(prefix));
  return rankByRemoteName(
    roots.map((name) => name.slice(prefix.length)),
    tenantName,
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
  return rankByRemoteName(siteNames, location.siteSlug).map(
    (siteName) => `${siteName}${suffix}`,
  );
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
