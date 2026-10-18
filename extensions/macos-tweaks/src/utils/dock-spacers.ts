import { execFile, execFileSync } from "child_process";
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
 * Counts the spacers on both sides and, in "remove" mode, writes each side back without them —
 * all in one process. `defaults` cannot delete one element of an array, and the alternative, an
 * export imported back whole, would undo any other Dock change made while it was edited; this
 * touches only the two tile arrays, within milliseconds of reading them. A missing array (a Dock
 * never customised) holds no spacers; anything else that goes wrong makes osascript fail.
 */
const SPACERS_SCRIPT = `
ObjC.import("Foundation");
function run(argv) {
  const [domain, mode] = argv;
  const keys = JSON.parse(argv[2]);
  const spacerTypes = JSON.parse(argv[3]);
  const prefs = $.NSUserDefaults.alloc.initWithSuiteName(domain);
  let count = 0;
  for (const key of keys) {
    const tiles = prefs.arrayForKey(key);
    if (tiles.isNil()) continue;
    const kept = $.NSMutableArray.array;
    for (let i = 0; i < tiles.count; i++) {
      const tile = tiles.objectAtIndex(i);
      if (spacerTypes.includes(ObjC.unwrap(tile.objectForKey("tile-type")))) count++;
      else kept.addObject(tile);
    }
    if (mode === "remove" && kept.count < tiles.count) prefs.setObjectForKey(kept, key);
  }
  if (mode === "remove") prefs.synchronize;
  return String(count);
}`;

async function runSpacersScript(mode: "count" | "remove"): Promise<number> {
  const args = [DOCK_DOMAIN, mode, JSON.stringify(Object.values(SIDE_KEYS)), JSON.stringify([...SPACER_TYPES])];
  const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", SPACERS_SCRIPT, ...args], {
    encoding: "utf-8",
    timeout: 5000,
  });
  const output = stdout.trim();
  // Number("") is 0: an empty answer must not read as "no spacers"
  if (!/^\d+$/.test(output)) throw new Error(`Could not read the Dock spacers: unexpected output "${output}"`);
  return Number(output);
}

/** How many spacers the Dock holds, on both sides. */
export async function countDockSpacers(): Promise<number> {
  return runSpacersScript("count");
}

/** Take every spacer out of the Dock and return how many there were. */
export async function removeDockSpacers(): Promise<number> {
  const removed = await runSpacersScript("remove");
  if (removed > 0) restartProcess("Dock");
  return removed;
}
