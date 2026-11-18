import { execFileSync } from "child_process";
import { SpaceInfo } from "./format";

/**
 * Native macOS space detection.
 *
 * macOS has no public API for Spaces, but the private SkyLight framework exposes
 * the active space id via `SLSGetActiveSpace`. We call it through JXA
 * (`osascript -l JavaScript`), which can bind arbitrary C functions from a loaded
 * framework via `ObjC.bindFunction` — so there's nothing to compile and no Xcode
 * tooling required. The active-space id is then mapped to a 1-based index +
 * display by reading the (reliably ordered) space list from `com.apple.spaces`.
 *
 * Reading the active space is a harmless read-only call — no SIP changes and no
 * scripting addition are required.
 */

// JXA that loads SkyLight, binds the two C functions we need, and prints the
// active space id. Run via `osascript -l JavaScript`.
const ACTIVE_SPACE_JXA = `
ObjC.import("Foundation");
$.NSBundle.bundleWithPath("/System/Library/PrivateFrameworks/SkyLight.framework").load;
ObjC.bindFunction("SLSMainConnectionID", ["int", []]);
ObjC.bindFunction("SLSGetActiveSpace", ["unsigned long long", ["int"]]);
$.SLSGetActiveSpace($.SLSMainConnectionID()).toString();
`;

/** The id of the currently active macOS space. */
export function getActiveSpaceId(): number {
  const out = execFileSync("/usr/bin/osascript", ["-l", "JavaScript", "-e", ACTIVE_SPACE_JXA], {
    timeout: 5000,
    encoding: "utf8",
  }).trim();
  const id = Number(out);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`Could not read the active space (osascript returned "${out}").`);
  }
  return id;
}

interface SpaceMeta {
  index: number;
  display: number;
}

interface RawSpace {
  ManagedSpaceID?: number;
}
interface RawMonitor {
  Spaces?: RawSpace[];
  /** The main (menu-bar) display reports the literal string "Main" here. */
  "Display Identifier"?: string;
}
interface RawPrefs {
  SpacesDisplayConfiguration?: { "Management Data"?: { Monitors?: RawMonitor[] } };
}

let cache: { at: number; map: Map<number, SpaceMeta> } | undefined;
const MAP_TTL_MS = 15000;

// Display number (1-based) of the main display, per the most recent map build.
let mainDisplayNum = 1;

/** The display number of the main (menu-bar) display. */
export function mainDisplay(): number {
  return mainDisplayNum;
}

/**
 * Builds an id -> {index, display} map from com.apple.spaces. The list ordering
 * is reliable (only the cached "current space" pointer is stale, which we don't
 * use). Index is 1-based and global across displays.
 */
function buildSpaceMap(): Map<number, SpaceMeta> {
  // Absolute paths + explicit env: Raycast spawns extension processes with a stripped PATH, so
  // bare command names would fail with ENOENT (same reason as desktopShortcuts.ts).
  const env = {
    ...process.env,
    PATH: `${process.env.PATH ? process.env.PATH + ":" : ""}/usr/bin:/bin:/usr/sbin:/sbin`,
  };
  const xml = execFileSync("/usr/bin/defaults", ["export", "com.apple.spaces", "-"], {
    timeout: 5000,
    encoding: "utf8",
    env,
  });
  const json = execFileSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", "-"], {
    input: xml,
    timeout: 5000,
    encoding: "utf8",
    env,
  });
  const data = JSON.parse(json) as RawPrefs;
  const monitors = data.SpacesDisplayConfiguration?.["Management Data"]?.Monitors ?? [];
  const map = new Map<number, SpaceMeta>();
  let counter = 0;
  monitors.forEach((mon, displayIndex) => {
    if (mon["Display Identifier"] === "Main") mainDisplayNum = displayIndex + 1;
    for (const sp of mon.Spaces ?? []) {
      counter++;
      if (typeof sp.ManagedSpaceID === "number") {
        map.set(sp.ManagedSpaceID, { index: counter, display: displayIndex + 1 });
      }
    }
  });
  return map;
}

function spaceMap(mustContain?: number): Map<number, SpaceMeta> {
  const now = Date.now();
  const stale = !cache || now - cache.at > MAP_TTL_MS;
  const missing = mustContain != null && cache != null && !cache.map.has(mustContain);
  if (stale || missing) {
    try {
      cache = { at: now, map: buildSpaceMap() };
    } catch {
      cache = cache ?? { at: now, map: new Map<number, SpaceMeta>() };
    }
  }
  return (cache ?? { at: now, map: new Map<number, SpaceMeta>() }).map;
}

/** Resolve a space id to its index/display (used for both live and recorded events). */
export function spaceInfoForId(id: number): SpaceInfo {
  let meta = spaceMap().get(id);
  if (!meta) meta = spaceMap(id).get(id); // rebuild once if this is a new/unknown space
  return { id, index: meta?.index ?? 0, label: "", display: meta?.display ?? 1 };
}

/** The currently focused space, resolved to an index/display. Throws if unavailable. */
export function getCurrentSpace(): SpaceInfo {
  return spaceInfoForId(getActiveSpaceId());
}

/**
 * Every space macOS currently knows about, ordered by index. Pass `fresh` to
 * bypass the cache (e.g. for the naming command); the menu bar uses the cache.
 */
export function listSpaces(fresh = false): SpaceInfo[] {
  const map = fresh ? buildSpaceMap() : spaceMap();
  if (fresh) cache = { at: Date.now(), map };
  const out: SpaceInfo[] = [];
  for (const [id, meta] of map.entries()) {
    out.push({ id, index: meta.index, label: "", display: meta.display });
  }
  out.sort((a, b) => a.index - b.index);
  return out;
}
