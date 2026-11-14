// What every library's catalog refresh shares: the downloader, atomic writes, and tile files.

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { toTile } from "./svg";
import { Catalog, IconNode, LibraryId, LibraryInfo } from "./types";

/** Bump when the tile files change shape, so cached drawings are redrawn. */
export const TILE_FORMAT = 9;

export interface Fetcher {
  json(url: string): Promise<unknown>;
  /** A small text file, read as text and never run. */
  text(url: string): Promise<string>;
  /** The raw bytes of a download, for the gzipped package tarball. */
  bytes(url: string): Promise<AsyncIterable<Uint8Array>>;
}

export const httpFetcher: Fetcher = {
  async json(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
    return response.json();
  },
  async text(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
    return response.text();
  },
  async bytes(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok || !response.body) throw new Error(`${new URL(url).host} answered ${response.status}`);
    return Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  },
};

/** A library beyond Lucide and Hugeicons, listed in `extra-libraries.ts`. */
export interface ExtraLibrary {
  info: LibraryInfo;
  /** Attributes on every tile's root element. */
  rootAttributes: Record<string, string>;
  /** Builds a fresh catalog in `dir`. `sources` is whatever the command passes as `CatalogSources.extra`. */
  refresh: (dir: string, fetcher: Fetcher, now: number, sources: Record<string, unknown>) => Promise<Catalog>;
}

export function libraryDir(root: string, library: LibraryId): string {
  return join(root, library);
}

/** Writes an icon's tile; `base` is the path without `.svg`. `drawing` as for `toTile`. */
export function writeTile(base: string, nodes: IconNode[], library: LibraryId, drawing?: string): void {
  writeFileSync(`${base}.svg`, toTile(nodes, library, drawing));
}

export function writeJsonAtomic(path: string, value: unknown): void {
  writeFileSync(`${path}.tmp`, JSON.stringify(value));
  renameSync(`${path}.tmp`, path);
}

export function readJson<T>(path: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

/** Builds a drawings folder under a temporary name, then swaps it in whole. */
export function writeFolderAtomic(
  dir: string,
  name: string,
  fill: (partial: string) => void | Promise<void>,
): Promise<void> {
  const partial = join(dir, `${name}.partial`);
  rmSync(partial, { recursive: true, force: true });
  mkdirSync(partial, { recursive: true });
  return Promise.resolve(fill(partial)).then(
    () => {
      rmSync(join(dir, name), { recursive: true, force: true });
      renameSync(partial, join(dir, name));
    },
    (error: unknown) => {
      rmSync(partial, { recursive: true, force: true });
      throw error;
    },
  );
}
