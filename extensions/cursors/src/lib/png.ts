import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment } from "@raycast/api";
import type { Cursor, PngSize } from "../interface";
import { ensureWasm, renderCursorPng } from "./render";

export { renderCursorPng };

/** Fixed size used for Quick Look previews. */
const QUICK_LOOK_SIZE: PngSize = 512;

/** Load the bundled resvg WASM binary from the extension's assets directory. */
function loadWasm(): Promise<Buffer> {
  return readFile(join(environment.assetsPath, "resvg.wasm"));
}

/** The directory where rendered cursor PNGs live. */
function pngDir(): string {
  return join(environment.supportPath, "png");
}

/**
 * Render a cursor PNG and write it to the extension's support directory,
 * returning the absolute file path. The filename is deterministic per
 * (cursor, size), so repeated exports overwrite rather than accumulate.
 */
export async function writeCursorPng(id: string, svg: string, size: PngSize): Promise<string> {
  await ensureWasm(loadWasm);

  const dir = pngDir();
  await mkdir(dir, { recursive: true });

  const path = join(dir, `${id}-${size}.png`);
  const png = renderCursorPng(svg, size);
  await writeFile(path, png);

  return path;
}

/** The deterministic path a cursor's Quick Look PNG will occupy once rendered. */
export function quickLookPath(id: string): string {
  return join(pngDir(), `${id}-${QUICK_LOOK_SIZE}.png`);
}

/**
 * Pre-render every cursor to a PNG so Quick Look (⌘Y) has a file ready the
 * instant it's toggled. Idempotent — re-rendering overwrites in place. Runs
 * once on grid mount; the whole set is ~40 small PNGs.
 *
 * Each cursor renders independently: one failure never blocks the rest, and
 * only the ids that actually landed on disk are returned. Callers must gate a
 * tile's Quick Look on membership in this set — a cursor missing from it has no
 * file to preview. Rejects only if the WASM renderer itself can't load (in
 * which case nothing rendered).
 */
export async function prepareQuickLook(cursors: Cursor[]): Promise<Set<string>> {
  await ensureWasm(loadWasm);
  const dir = pngDir();
  await mkdir(dir, { recursive: true });

  const results = await Promise.all(
    cursors.map(async (cursor) => {
      try {
        const png = renderCursorPng(cursor.svg, QUICK_LOOK_SIZE);
        await writeFile(join(dir, `${cursor.id}-${QUICK_LOOK_SIZE}.png`), png);
        return cursor.id;
      } catch {
        return null;
      }
    }),
  );

  return new Set(results.filter((id): id is string => id !== null));
}
