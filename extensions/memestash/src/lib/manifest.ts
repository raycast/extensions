/**
 * Manifest read/write. Pure and path-parameterized (takes the manifest path as
 * an argument) so it has no dependency on preference resolution — that keeps it
 * free of the import cycle that would form if it reached back into library.ts.
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { Manifest, MANIFEST_VERSION } from "./types";

/**
 * Load the manifest, returning an empty one if the file doesn't exist yet.
 * A file that exists but can't be parsed THROWS rather than returning empty —
 * silently returning {} here would let a later save destroy a recoverable
 * manifest. The caller surfaces the error instead.
 */
export function loadManifest(manifestPath: string): Manifest {
  if (!existsSync(manifestPath)) {
    return { version: MANIFEST_VERSION, items: {} };
  }
  let parsed: Manifest;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  } catch {
    throw new Error(
      `Could not parse manifest at ${manifestPath}. It may be corrupt — not overwriting.`,
    );
  }
  return {
    version: parsed.version ?? MANIFEST_VERSION,
    items: parsed.items ?? {},
  };
}

export function saveManifest(manifestPath: string, manifest: Manifest): void {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
