import { pathToFileURL } from "url";
import { TileMeta } from "./tiles";

export function isValidUrl(u: string | undefined): boolean {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.hostname !== "none.com";
  } catch {
    return false;
  }
}

export function encodeFileUri(p: string): string {
  return pathToFileURL(p).href;
}

export function tileLetter(id: string): string {
  return id.split("_")[0].toUpperCase();
}

export function preferredTileUrl(meta: TileMeta | undefined): string | undefined {
  if (!meta) return undefined;
  if (isValidUrl(meta.titleUrl)) return meta.titleUrl;
  if (isValidUrl(meta.coordsUrl)) return meta.coordsUrl;
  return undefined;
}
