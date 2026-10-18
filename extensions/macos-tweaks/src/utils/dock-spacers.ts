import { execFile, execFileSync } from "child_process";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { restartProcess } from "./defaults";

const execFileAsync = promisify(execFile);

export const DOCK_DOMAIN = "com.apple.dock";

export type SpacerSize = "small" | "regular";
export type DockSide = "apps" | "documents";

const TILE_TYPES: Record<SpacerSize, string> = { small: "small-spacer-tile", regular: "spacer-tile" };
const SPACER_TYPES = new Set(Object.values(TILE_TYPES));

/** The Dock keeps the tiles left of its divider in one array, and the folders and documents right of it in another. */
export const SIDE_KEYS: Record<DockSide, string> = { apps: "persistent-apps", documents: "persistent-others" };

/**
 * The apps side accepts a bare `tile-type`, but on macOS 27 the documents side silently drops a
 * small spacer that has no `tile-data` — so every spacer carries an empty one.
 */
function spacerTile(size: SpacerSize): string {
  return `{"tile-data"={}; "tile-type"="${TILE_TYPES[size]}";}`;
}

/** Append a spacer at the end of one side of the Dock, then restart the Dock so it shows. */
export function addDockSpacer(size: SpacerSize, side: DockSide): void {
  execFileSync("defaults", ["write", DOCK_DOMAIN, SIDE_KEYS[side], "-array-add", spacerTile(size)], {
    timeout: 5000,
  });
  restartProcess("Dock");
}

/** The shell equivalent of addDockSpacer() (for clipboard copy). */
export function getSpacerCommandString(size: SpacerSize, side: DockSide): string {
  return `defaults write ${DOCK_DOMAIN} ${SIDE_KEYS[side]} -array-add '${spacerTile(size)}' && killall Dock`;
}

/**
 * Run `fn` on a throwaway export of the Dock preferences. `defaults read` prints the tile arrays in
 * a format meant for people, while `plutil` can address one element of an exported file by index.
 */
async function withDockExport<T>(fn: (file: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "macos-tweaks-"));
  const file = join(dir, "dock.plist");
  try {
    await execFileAsync("defaults", ["export", DOCK_DOMAIN, file], { timeout: 5000 });
    return await fn(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function plutilRaw(file: string, keyPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("plutil", ["-extract", keyPath, "raw", "-o", "-", file], {
      encoding: "utf-8",
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

/** The `tile-type` of every tile on one side, in Dock order. `raw` on an array prints its length. */
async function readTileTypes(file: string, key: string): Promise<string[]> {
  const count = Number(await plutilRaw(file, key));
  // The array is absent on a Dock that was never customised
  if (!Number.isInteger(count)) return [];
  return Promise.all(
    Array.from({ length: count }, async (_, i) => (await plutilRaw(file, `${key}.${i}.tile-type`)) ?? ""),
  );
}

/** How many spacers the Dock holds, on both sides. */
export async function countDockSpacers(): Promise<number> {
  return withDockExport(async (file) => {
    const sides = await Promise.all(Object.values(SIDE_KEYS).map((key) => readTileTypes(file, key)));
    return sides.flat().filter((type) => SPACER_TYPES.has(type)).length;
  });
}

/**
 * Take every spacer out of the Dock and return how many there were. `defaults` cannot delete one
 * element of an array, so the spacers are removed from an export, which is imported back whole.
 */
export async function removeDockSpacers(): Promise<number> {
  const removed = await withDockExport(async (file) => {
    let count = 0;
    for (const key of Object.values(SIDE_KEYS)) {
      const types = await readTileTypes(file, key);
      // From the end, so the indices still to remove do not shift
      for (let i = types.length - 1; i >= 0; i--) {
        if (!SPACER_TYPES.has(types[i])) continue;
        await execFileAsync("plutil", ["-remove", `${key}.${i}`, file], { timeout: 5000 });
        count++;
      }
    }
    if (count > 0) await execFileAsync("defaults", ["import", DOCK_DOMAIN, file], { timeout: 5000 });
    return count;
  });
  if (removed > 0) restartProcess("Dock");
  return removed;
}
