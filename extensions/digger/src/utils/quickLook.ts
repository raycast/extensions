import { createHash } from "crypto";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { environment } from "@raycast/api";
import { displaySafe, quickLookMarkup } from "./svgUtils";

const QUICK_LOOK_DIR = join(tmpdir(), "digger-quicklook");

/** A short, filesystem-safe id for an asset key, which can be kilobytes of markup. */
export function assetId(key: string): string {
  return createHash("sha1").update(key).digest("hex").slice(0, 16);
}

/**
 * Where an asset's Quick Look file lives. The name carries the appearance (its
 * ink differs) and a hash of the markup: a file-backed SVG keeps its key when the
 * server changes the file, and a name built from the key alone would keep
 * previewing the old one.
 */
export function quickLookPath(id: string, markup: string): string {
  const content = createHash("sha1").update(markup).digest("hex").slice(0, 12);
  return join(QUICK_LOOK_DIR, `${id}-${content}-${environment.appearance}.svg`);
}

/**
 * Writes one SVG for Quick Look, if it is not already on disk. macOS previews
 * `.svg` natively, so there is no rasterizing — and it is still done one tile
 * at a time, for the highlighted one, as Central Icons does. Returns undefined
 * on failure: a missing preview must never break the grid.
 */
export async function ensureQuickLook(id: string, markup: string): Promise<string | undefined> {
  const path = quickLookPath(id, markup);
  if (existsSync(path)) return path;
  try {
    await mkdir(QUICK_LOOK_DIR, { recursive: true });
    // Quick Look renders with WebKit, which would follow the SVG's own external
    // references; the file it opens is a display copy (see displaySafe).
    const appearance = environment.appearance === "dark" ? "dark" : "light";
    await writeFile(path, quickLookMarkup(displaySafe(markup), appearance), "utf8");
    return path;
  } catch {
    return undefined;
  }
}
