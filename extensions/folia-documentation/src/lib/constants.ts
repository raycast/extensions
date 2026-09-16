export const CACHE_SCHEMA = "v1";

export interface FoliaVersion {
  value: string;
  title: string;
}

// Only these three builds actually have a published Javadoc on jd.papermc.io;
// every other entry fill.papermc.io lists for the Folia project 404s there.
export const FOLIA_VERSIONS: FoliaVersion[] = [
  { value: "26.2", title: "26.2 (Latest)" },
  { value: "26.1.2", title: "26.1.2" },
  { value: "1.21.11", title: "1.21.11" },
];

export const DEFAULT_VERSION = "26.2";

export function docsBase(version: string): string {
  return `https://jd.papermc.io/folia/${version}/`;
}

export const GUIDES_BASE = "https://docs.papermc.io/folia/";

export const SOURCE_REPOSITORY = "PaperMC/Folia";

export const REQUEST_TIMEOUT = 15000;

export function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT);
}
