// The Raycast and macOS side: reads and moves real windows. Every coordinate conversion lives here.

import {
  Cache,
  LaunchType,
  WindowManagement,
  closeMainWindow,
  environment,
  getPreferenceValues,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import {
  arrange,
  assignDisplays,
  freshLimits,
  toItem,
  type Limits,
  type Placed,
  type System,
  type Win,
} from "./arrange";
import { carry, crowded, ranked, type Frame, type Layout } from "./layouts";
import { roleOf, type Role } from "./roles";

const jxa = (script: string) => runAppleScript(script, { language: "JavaScript" });
const jxaJSON = async <T>(script: string): Promise<T> => JSON.parse(await jxa(script));

export type Panel = "notes" | "ai";
export const isPanel = (value: unknown): value is Panel => value === "notes" || value === "ai";

export const prefs = () => {
  const p = getPreferenceValues<Preferences>();
  // "ai" or Raycast Notes. An older version also had "focused", which Make Sidebar replaced.
  const sidebar: Panel = p.sidebar === "ai" ? "ai" : "notes";
  return { gap: Number(p.gap) || 0, screenGap: Number(p.screenGap) || 0, sidebar };
};

/**
 * Runs a command's work after the launcher closes. Without Raycast Pro the WindowManagement API is off,
 * so say that instead of failing. Any other error is shown rather than swallowed.
 */
export async function run(work: () => Promise<string>) {
  await closeMainWindow();
  if (!environment.canAccess(WindowManagement)) {
    await showFailureToast("Window Management+ needs Raycast Pro to move windows.", {
      title: "Raycast Pro required",
    });
    return;
  }
  try {
    await showHUD(await work());
  } catch (error) {
    await showFailureToast(error, { title: "Could not arrange windows" });
  }
}

/**
 * Arrange every window, running the layout again when an app clamps the size it was given.
 * With `activeOnly`, only the display holding the active window is touched.
 */
export const tile = (
  layout: Layout,
  include?: () => Promise<string | undefined>,
  activeOnly = false,
  done = "Arranged",
  onPlaced?: OnPlaced,
) => run(async () => apply(layout, 4, await include?.(), activeOnly, done, onPlaced));

/** Called once windows have been arranged, with where each was put. Not called when nothing could be moved. */
export type OnPlaced = (placed: Placed[]) => void;

/**
 * Minimum and maximum sizes apps insisted on, by window id, kept between runs. Without them every run would ask first,
 * find out, and move the neighbours a second time.
 */
/** The one Cache for the extension. Two instances would each rewrite the index and lose the other's keys. */
export const cache = new Cache();
const LEARNED = "window-limits-v6";
/**
 * Raycast Notes can't go narrower than this, and asked to, it ignores the whole resize, height included.
 * It is never learned from, so its minimum is given here.
 */
const NOTES_MIN_WIDTH = 400;
const loadLearned = () =>
  freshLimits(new Map<string, Limits>(JSON.parse(cache.get(LEARNED) ?? "[]"))).set("raycast:Notes", {
    min: { width: NOTES_MIN_WIDTH },
  });
/** Window ids die with their windows, so only the most recently learned are kept. */
const saveLearned = (learned: Map<string, Limits>) => cache.set(LEARNED, JSON.stringify([...learned].slice(-200)));

/** Two runs at once would each read the other's moves as app limits. A lock older than this is stale. */
const LOCK = "running-since";
const LOCK_MS = 15_000;

/** Runs `work` unless another run is still going. */
async function alone(work: () => Promise<string>) {
  const since = Number(cache.get(LOCK));
  if (since && Date.now() - since < LOCK_MS) return "Already arranging";
  cache.set(LOCK, String(Date.now()));
  try {
    return await work();
  } finally {
    cache.remove(LOCK);
  }
}

const apply = (
  layout: Layout,
  passes: number,
  include?: string,
  activeOnly = false,
  done = "Arranged",
  onPlaced?: OnPlaced,
) => alone(() => arrangeAll(layout, passes, include, activeOnly, done, onPlaced));

/** What to tell the user once windows have moved. */
function report(count: number, failed: string[], done: string) {
  if (!failed.length) return done;
  if (failed.length === count) throw new Error(`No window could be moved (${failed.join(", ")}).`);
  return `${done}, but could not move ${failed.join(", ")}`;
}

/** What happens once windows land on another display: lay them out again, or keep their relative frames. */
export type Landing = { layout: Layout; include?: string; onPlaced?: OnPlaced };

/**
 * Moves every window to the display `assign` gives it. Given a landing layout, windows go straight into
 * its slots on their display. Otherwise each keeps its place and size relative to the screen. Moves go
 * one at a time, are checked, and are tried once more if a window didn't arrive. Returns the windows
 * that never did.
 */
async function relocate(
  system: System,
  areas: Frame[],
  windows: Win[],
  assign: Map<string, number>,
  landing?: Landing,
  order?: Map<string, number>,
): Promise<string[]> {
  const learned = loadLearned();
  // Top row first, then left to right
  const reading = (a: Win, b: Win) =>
    a.screen - b.screen || (Math.abs(a.frame.y - b.frame.y) > 40 ? a.frame.y - b.frame.y : a.frame.x - b.frame.x);
  const placements = areas.flatMap((area, to) => {
    const here = windows.filter((w) => assign.get(w.id) === to);
    const staying = here.some((w) => w.screen === to);
    const arriving = here.filter((w) => w.screen !== to).sort(reading);
    const items = here.map((w) => {
      const item = toItem(w, learned.get(w.id));
      const rank = order?.get(w.id);
      if (rank !== undefined) return { ...item, frame: ranked(rank) };
      // Windows already here keep their places. Ones arriving join after them, in the order they
      // were in. On a display nobody is staying on, they keep their places relative to the screen.
      if (w.screen === to || !staying) return { ...item, frame: carry(item, areas[w.screen], area) };
      return { ...item, frame: after(area, arriving.indexOf(w)) };
    });
    if (!items.length) return [];
    const frames = landing ? landing.layout(items, area, to) : items.map((i) => ({ id: i.id, frame: i.frame }));
    return frames.map((p) => ({ ...p, screen: to }));
  });

  // One at a time: several windows crossing displays at once is where moves get dropped.
  // A window that couldn't be moved is kept track of, and cleared if a later try works.
  const unmoved = new Map<string, string>();
  const moveAll = async (list: typeof placements) => {
    for (const p of list) {
      const [failure] = await system.place([p]);
      if (failure) unmoved.set(p.id, failure.name);
      else unmoved.delete(p.id);
    }
  };
  const astray = async () => {
    await new Promise((r) => setTimeout(r, 150));
    const now = await system.windows();
    return placements.filter((p) => now.find((w) => w.id === p.id)?.screen !== p.screen);
  };
  await moveAll(placements);
  const retry = await astray();
  if (retry.length) await moveAll(retry);
  const stuck = retry.length ? await astray() : [];

  // Apps that wouldn't take the size they were given get one more pass, the same as tiling
  const settled = landing ? await settle(landing.layout, 4, landing.include, false, landing.onPlaced) : undefined;
  const astrayNames = stuck.map((p) => windows.find((w) => w.id === p.id)?.name ?? "a window");
  // Everything that didn't end up where it was meant to, whichever step it failed at
  return [...new Set([...unmoved.values(), ...astrayNames, ...(settled?.failed ?? [])])];
}

/** A window as the AI tools describe it. */
export type OpenWindow = {
  id: string;
  app: string;
  bundleId?: string;
  title?: string;
  /** The part it plays: what you make, what you read, people, or what runs alongside. */
  role: Role;
  display: number;
  focused: boolean;
  frame: Frame;
};

/** The category each app declares, by app path. Apps that declare none are left out. */
async function appCategories(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  return jxaJSON(`ObjC.import("Foundation")
const out = {}
for (const path of ${JSON.stringify(paths)}) {
  const info = $.NSBundle.bundleWithPath(path)?.infoDictionary
  const category = info && ObjC.unwrap(info.objectForKey("LSApplicationCategoryType"))
  if (category) out[path] = category
}
JSON.stringify(out)`);
}

/** Where a window is now: its screen and its frame there. Undefined when it isn't open. */
export async function whereIs(
  isIt: (w: { id: string; title?: string }) => boolean,
): Promise<{ screen: number; frame: Frame } | undefined> {
  const w = (await raycastSystem().windows()).find(isIt);
  return w && { screen: w.screen, frame: w.frame };
}

/** Every display and every window worth arranging, for the AI tools. */
export async function listWindows(): Promise<{
  displays: (Frame & { index: number })[];
  windows: OpenWindow[];
  /** Whether these windows, in this order, fit on a display in `layout` at sizes their apps accept. */
  fits: (display: number, ids: string[], layout: Layout) => boolean;
}> {
  const system = raycastSystem();
  const [areas, windows] = await Promise.all([system.areas(), system.windows()]);
  const paths = [...new Set(windows.flatMap((w) => (w.appPath ? [w.appPath] : [])))];
  // A category that can't be read only costs a less tailored layout
  const categories = await appCategories(paths).catch(() => ({}) as Record<string, string>);
  const learned = loadLearned();
  const fits = (display: number, ids: string[], layout: Layout) => {
    const items = ids.flatMap((id, rank) => {
      const w = windows.find((x) => x.id === id);
      return w ? [{ ...toItem(w, learned.get(id)), frame: ranked(rank) }] : [];
    });
    return !crowded(layout(items, areas[display]), areas[display]);
  };
  return {
    fits,
    displays: areas.map((a, index) => ({ index, ...a })),
    windows: windows.map((w) => ({
      id: w.id,
      app: w.name ?? "Unknown",
      bundleId: w.bundleId,
      title: w.label,
      role: roleOf({ bundleId: w.bundleId, category: w.appPath && categories[w.appPath], title: w.title }),
      display: w.screen,
      focused: !!w.active,
      frame: w.frame,
    })),
  };
}

/**
 * Puts each planned window on its display in the order given, tiled with `layoutOf` that display.
 * Windows left out of the plan stay on their display, after the planned ones. For the AI tools, so it
 * returns its message instead of showing it.
 */
export function placeWindows(
  plan: Map<string, { display: number; rank: number }>,
  layoutOf: (display: number) => Layout,
  onPlaced?: OnPlaced,
) {
  if (!environment.canAccess(WindowManagement))
    throw new Error("Window Management+ needs Raycast Pro to move windows.");
  return alone(async () => {
    const system = raycastSystem();
    const [areas, windows] = await Promise.all([system.areas(), system.windows()]);
    if (!windows.length) return "No windows to arrange";
    const display = (w: Win) => {
      const to = plan.get(w.id)?.display;
      return to !== undefined && areas[to] ? to : w.screen;
    };
    const assign = new Map(windows.map((w) => [w.id, display(w)]));
    const order = new Map(windows.map((w, k) => [w.id, plan.get(w.id)?.rank ?? 50 + k]));
    // One layout that picks by the screen it is laying out, so each display can have its own
    const layout: Layout = (items, box, screen = 0) => layoutOf(screen)(items, box, screen);
    const stuck = await relocate(system, areas, windows, assign, { layout, onPlaced }, order);
    return report(windows.length, stuck, `Arranged ${windows.length} windows`);
  });
}

/**
 * A stand-in frame past the bottom-right of an area, so layouts place a window after everything already
 * there: `nth` among the ones arriving. It is tiny, so it is never picked as the master.
 */
function after(area: Frame, nth: number): Frame {
  return { x: area.x + area.width + 200 * (nth + 1), y: area.y + area.height + 200, width: 1, height: 1 };
}

/** Every window moves to the next display. With two displays they swap. */
export const swapDisplays = (landing?: Landing) =>
  run(() =>
    alone(async () => {
      const system = raycastSystem(landing?.include);
      const [areas, windows] = await Promise.all([system.areas(), system.windows()]);
      if (areas.length < 2) return "Only one display";
      if (!windows.length) return "No windows to swap";
      const next = new Map(windows.map((w) => [w.id, (w.screen + 1) % areas.length]));
      const stuck = await relocate(system, areas, windows, next, landing);
      return report(windows.length, stuck, "Swapped displays");
    }),
  );

/**
 * The focused window keeps its display to itself. Every other window there moves to the next display
 * and is tiled with what is already on it.
 */
export const moveOthers = (landing: Landing) =>
  run(() =>
    alone(async () => {
      const system = raycastSystem(landing.include);
      const [areas, windows] = await Promise.all([system.areas(), system.windows()]);
      if (areas.length < 2) return "Only one display";
      const focused = windows.find((w) => w.active);
      if (!focused) return "No focused window";
      const next = (focused.screen + 1) % areas.length;
      const moving = windows.filter((w) => w.screen === focused.screen && w !== focused);
      if (!moving.length) return "No other windows to move";
      const assign = new Map(windows.map((w) => [w.id, moving.includes(w) ? next : w.screen]));
      const stuck = await relocate(system, areas, windows, assign, landing);
      return report(moving.length, stuck, `Moved ${moving.length} ${moving.length === 1 ? "window" : "windows"}`);
    }),
  );

/** Every window on the other displays comes to the display with the focused window, and is tiled with it. */
export const moveAll = (landing: Landing) =>
  run(() =>
    alone(async () => {
      const system = raycastSystem(landing.include);
      const [areas, windows] = await Promise.all([system.areas(), system.windows()]);
      if (areas.length < 2) return "Only one display";
      const focused = windows.find((w) => w.active);
      if (!focused) return "No focused window";
      const coming = windows.filter((w) => w.screen !== focused.screen);
      if (!coming.length) return "No windows on other displays";
      const assign = new Map(windows.map((w) => [w.id, focused.screen]));
      const stuck = await relocate(system, areas, windows, assign, landing);
      return report(coming.length, stuck, `Moved ${coming.length} ${coming.length === 1 ? "window" : "windows"}`);
    }),
  );

/**
 * Spreads every window over every display, a share for each by size and no more than each can fit,
 * then tiles each display with `landing`'s layout. The active window stays where it is.
 */
export const distributeDisplays = (landing: Landing, fitting: Layout = landing.layout) =>
  run(() =>
    alone(async () => {
      const system = raycastSystem(landing.include);
      const [areas, windows] = await Promise.all([system.areas(), system.windows()]);
      if (areas.length < 2) return "Only one display";
      if (!windows.length) return "No windows to distribute";
      // `fitting` is the layout without stacking, which would hide a display that is too full
      const assign = assignDisplays(windows, areas, fitting, loadLearned(), await system.origins?.());
      const stuck = await relocate(system, areas, windows, assign, landing);
      return report(windows.length, stuck, "Distributed windows");
    }),
  );

/** Arranges the windows there are, and says how it went. */
async function arrangeAll(
  layout: Layout,
  passes: number,
  include?: string,
  activeOnly = false,
  done = "Arranged",
  onPlaced?: OnPlaced,
) {
  const result = await settle(layout, passes, include, activeOnly, onPlaced);
  if (result.noFocus) return "Click into a window first, then run this again";
  if (!result.count) return "No windows to arrange";
  return report(result.count, result.failed, done);
}

/**
 * Arranges the windows there are. Resolves to how many there were and which could not be moved.
 * `onPlaced` is told where the windows went, unless none could be moved.
 */
async function settle(layout: Layout, passes: number, include?: string, activeOnly = false, onPlaced?: OnPlaced) {
  const learned = loadLearned();
  const result = await arrange(raycastSystem(include), layout, passes, learned, activeOnly);
  saveLearned(learned);
  const failed = result.failed.map((f) => f.name);
  if (result.count && failed.length < result.count) onPlaced?.(result.placed);
  return { count: result.count, failed, noFocus: result.noFocus };
}

// Screens

type Screen = { name: string; frame: Frame; visible: Frame };

/** Every screen in global top-left coordinates. `visible` leaves out the menu bar and Dock. */
const screensScript = `ObjC.import("AppKit")
const s = $.NSScreen.screens
const primaryH = s.objectAtIndex(0).frame.size.height
const out = []
for (let i = 0; i < s.count; i++) {
  const sc = s.objectAtIndex(i), f = sc.frame, v = sc.visibleFrame
  out.push({
    name: ObjC.unwrap(sc.localizedName),
    frame: { x: f.origin.x, y: primaryH - (f.origin.y + f.size.height), width: f.size.width, height: f.size.height },
    visible: { x: v.origin.x, y: primaryH - (v.origin.y + v.size.height), width: v.size.width, height: v.size.height },
  })
}
JSON.stringify(out)`;

const holdsCentre = (area: Frame, f: Frame) => {
  const x = f.x + f.width / 2;
  const y = f.y + f.height / 2;
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height;
};

/** The Raycast API works in each screen's own coordinates, macOS in global ones. */
const toLocal = (f: Frame, s: Screen): Frame => ({
  ...f,
  x: f.x - s.frame.x,
  y: f.y - s.frame.y,
});
/**
 * Raycast's API measures from the top-left of each screen's usable area, below a notch or menu bar, not
 * of the screen itself. Without this, windows on a notched display land that much lower than asked.
 */
const inset = (s: Screen) => ({ x: s.visible.x - s.frame.x, y: s.visible.y - s.frame.y });
const toApi = (f: Frame, s: Screen) => ({ x: f.x - inset(s).x, y: f.y - inset(s).y });
const fromApi = (f: Frame, s: Screen): Frame => ({ ...f, x: f.x + inset(s).x, y: f.y + inset(s).y });

const toGlobal = (f: Frame, s: Screen): Frame => ({
  ...f,
  x: f.x + s.frame.x,
  y: f.y + s.frame.y,
});

/**
 * Where every on-screen window really is, keyed like the Raycast API's ids (`pid_windowNumber`), in global
 * coordinates. The API's own bounds can lag well behind a move, so they are only a fallback.
 */
const boundsScript = `ObjC.import("CoreGraphics")
const list = ObjC.castRefToObject($.CGWindowListCopyWindowInfo(1, 0)) // 1: on-screen windows only
const frames = {}
const raycast = []
for (let i = 0; i < list.count; i++) {
  const d = list.objectAtIndex(i)
  const label = ObjC.unwrap(d.objectForKey("kCGWindowName")) || undefined
  // Raycast floats some of its windows above the normal layer, Notes among them
  if (label && ObjC.unwrap(d.objectForKey("kCGWindowOwnerName")) === "Raycast") raycast.push(label)
  if (ObjC.unwrap(d.objectForKey("kCGWindowLayer")) !== 0) continue
  const b = ObjC.deepUnwrap(d.objectForKey("kCGWindowBounds"))
  frames[ObjC.unwrap(d.objectForKey("kCGWindowOwnerPID")) + "_" + ObjC.unwrap(d.objectForKey("kCGWindowNumber"))] =
    { x: b.X, y: b.Y, width: b.Width, height: b.Height, label }
}
JSON.stringify({ frames, raycast })`;

/** What `boundsScript` returns: frames by window id, and the titles of Raycast's windows that are on screen. */
type OnScreen = { frames: Record<string, Frame & { label?: string }>; raycast: string[] };

// Raycast's own windows, through System Events

const RAYCAST = "com.raycast.macos";
const LAUNCHER = "Main Window";
const PANELS: Record<Panel, { title: string; extensionName: string; name: string }> = {
  notes: { title: "Notes", extensionName: "raycast-notes", name: "raycast-notes" },
  // Built-in extensions are named after their titles: "Raycast Notes" and "AI".
  ai: { title: "AI Chat", extensionName: "ai", name: "ai-chat" },
};

export const panelTitle = (panel: Panel) => PANELS[panel].title;

const raycastProcess = `Application("System Events").processes.byName("Raycast")`;

/** Raycast's API has no window titles and doesn't list Notes at all. System Events has both, in global coordinates. */
const raycastWindows = async (): Promise<(Frame & { title: string })[]> => {
  try {
    return await jxaJSON(`JSON.stringify(${raycastProcess}.windows().map((w) => ({
  title: w.name(), x: w.position()[0], y: w.position()[1], width: w.size()[0], height: w.size()[1] })))`);
  } catch (error) {
    throw new Error(
      "Could not read Raycast's windows. Allow Raycast to control System Events in System Settings › Privacy & Security › Automation.",
      { cause: error },
    );
  }
};

/**
 * Moves one of Raycast's own windows. It is resized before it is moved as well as after, because a
 * resize is dropped while a window hangs over two screens, and one resized against a screen edge can
 * land short. The size is checked and sent again until it takes or stops changing.
 */
const moveRaycastWindow = (title: string, f: Frame) => {
  const position = `[${Math.round(f.x)}, ${Math.round(f.y)}]`;
  const size = `[${Math.round(f.width)}, ${Math.round(f.height)}]`;
  return jxa(`const w = ${raycastProcess}.windows.byName(${JSON.stringify(title)})
const size = ${size}
let last = ""
for (let tries = 0; tries < 4; tries++) {
  // Resized where it stands first: a resize is dropped while the window hangs over two screens
  w.size = size
  w.position = ${position}
  w.size = size
  delay(0.12)
  const got = w.size()
  if (Math.abs(got[0] - size[0]) < 3 && Math.abs(got[1] - size[1]) < 3) break
  // The same wrong size twice running is the window's own limit, not a dropped resize
  if (String(got) === last) break
  last = String(got)
}
w.position = ${position}`);
};

/** Opens Raycast Notes or AI Chat when it isn't open yet. Returns its window title. */
export async function openPanel(panel: Panel): Promise<string> {
  const { title, extensionName, name } = PANELS[panel];
  const isOpen = async () => (await raycastWindows()).some((w) => w.title === title);
  if (await isOpen()) return title;
  await launchCommand({ ownerOrAuthorName: "raycast", extensionName, name, type: LaunchType.UserInitiated });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (await isOpen()) return title;
  }
  throw new Error(`Raycast ${title} did not open.`);
}

// The window system

const near = (a: Frame, b: Frame) => (["x", "y", "width", "height"] as const).every((k) => Math.abs(a[k] - b[k]) < 3);

/**
 * Windows on the active desktop, minus fullscreen ones, ones parked off their screen and Raycast's launcher.
 * `include` names a Raycast window to arrange even when the API leaves it out. It is moved through System Events.
 */
function raycastSystem(include?: string): System {
  const screens = jxaJSON<Screen[]>(screensScript);
  const listed = new Map<string, { win: Win; api?: WindowManagement.Window }>();
  let desktops: WindowManagement.Desktop[] = [];
  let waitedForFocus = false;
  const focusedId = () =>
    WindowManagement.getActiveWindow().then(
      (w) => w.id,
      () => undefined,
    );

  return {
    // The usable area of each screen, less the gap kept clear round its edge
    areas: async () => {
      const edge = prefs().screenGap;
      return (await screens).map((s) => {
        const area = toLocal(s.visible, s);
        return { x: area.x + edge, y: area.y + edge, width: area.width - 2 * edge, height: area.height - 2 * edge };
      });
    },
    bounds: async () => (await screens).map((s) => toLocal(s.visible, s)),
    origins: async () => (await screens).map((s) => ({ x: s.frame.x, y: s.frame.y })),

    async windows() {
      const all = await screens;
      const [windows, allDesktops, raycast, onScreen, focusedNow] = await Promise.all([
        WindowManagement.getWindowsOnActiveDesktop(),
        WindowManagement.getDesktops(),
        raycastWindows(),
        jxaJSON<OnScreen>(boundsScript),
        // Each window's own `active` flag is true for all of them, so ask which one has focus.
        // It rejects when no window does.
        focusedId(),
      ]);
      // Launched from Raycast, a command can start before focus is back on the app underneath: the
      // focused window is then missing, or is Raycast's launcher. Give it a moment, the first time only.
      let focused = focusedNow;
      const known = (id?: string) => !!id && windows.some((w) => w.id === id);
      for (let tries = 0; !waitedForFocus && !known(focused) && tries < 6; tries++) {
        await new Promise((r) => setTimeout(r, 120));
        focused = await focusedId();
      }
      waitedForFocus = true;
      // Still nothing, as when Raycast's own window is in front. macOS lists windows front to back, so
      // the frontmost one that can be arranged is the one being worked in.
      if (!known(focused)) focused = Object.keys(onScreen.frames).find(known);
      desktops = allDesktops;
      const titled = raycast.map((w) => {
        const screen = Math.max(
          0,
          all.findIndex((s) => holdsCentre(s.frame, w)),
        );
        return { title: w.title, screen, frame: toLocal(w, all[screen]) };
      });

      listed.clear();
      for (const api of windows) {
        if (!api.positionable || api.bounds === "fullscreen") continue;
        let screen: number;
        let frame: Frame;
        const real = onScreen.frames[api.id];
        if (real) {
          screen = all.findIndex((s) => holdsCentre(s.frame, real));
          if (screen === -1) continue; // parked off every screen
          frame = toLocal({ x: real.x, y: real.y, width: real.width, height: real.height }, all[screen]);
        } else {
          const { position, size } = api.bounds;
          // Desktops are matched to a screen by name
          const name = desktops.find((d) => d.id === api.desktopId)?.screenId;
          screen = all.length === 1 ? 0 : all.findIndex((s) => s.name === name);
          if (screen === -1) continue;
          frame = fromApi({ x: position.x, y: position.y, width: size.width, height: size.height }, all[screen]);
          if (!holdsCentre(toLocal(all[screen].frame, all[screen]), frame)) continue;
        }

        // Raycast's own windows are told apart by title. macOS gives it by window id, which still works
        // when two of them sit in exactly the same place. Matching by frame is the fallback.
        const title =
          api.application?.bundleId === RAYCAST
            ? (real?.label ?? titled.find((t) => near(t.frame, frame))?.title)
            : undefined;
        if (title === LAUNCHER) continue;
        // A window that can't be resized and covers the whole screen is an overlay, like a screenshot
        // tool's capture layer. Tiled, it would take the screen and leave nothing for the rest.
        const usable = all[screen].visible;
        if (!api.resizable && frame.width >= usable.width - 2 && frame.height >= usable.height - 2) continue;
        listed.set(api.id, {
          win: {
            id: api.id,
            screen,
            frame,
            resizable: api.resizable,
            active: api.id === focused,
            title,
            name: title ? `Raycast ${title}` : api.application?.name,
            label: real?.label,
            bundleId: api.application?.bundleId,
            appPath: api.application?.path,
          },
          api,
        });
      }

      // Raycast Notes is a window like any other, but the API never lists it. It is added whenever it is
      // on screen, so it is tiled whether or not it is the sidebar, along with the window asked for.
      // System Events also lists windows that are minimized or on another desktop, which must be left out.
      for (const name of new Set([PANELS.notes.title, ...(include ? [include] : [])])) {
        const hidden = onScreen.raycast.includes(name) && titled.find((t) => t.title === name);
        if (hidden && ![...listed.values()].some((l) => l.win.title === name)) {
          listed.set(`raycast:${name}`, {
            // Moved through System Events, which answers too unevenly to learn its limits from
            win: { id: `raycast:${name}`, ...hidden, resizable: true, learns: false, name: `Raycast ${name}` },
          });
        }
      }
      return [...listed.values()].map((l) => l.win);
    },

    async place(placements) {
      const all = await screens;
      /**
       * The active desktop on a screen. A window's own desktop id can lag behind a move to another display,
       * so it comes from the desktop list. Two identical displays share a name, so then it comes from a
       * window already on that screen.
       */
      const desktopOf = (screen: number) => {
        const named = desktops.filter((d) => d.active && d.screenId === all[screen].name);
        if (named.length === 1) return named[0].id;
        return [...listed.values()].find((l) => l.win.screen === screen && l.api)?.api?.desktopId;
      };
      const failed = await Promise.all(
        placements.map(async ({ id, frame, screen = -1 }) => {
          const target = listed.get(id);
          if (!target) return undefined;
          const { win, api } = target;
          const onto = screen === -1 ? win.screen : screen;
          const desktopId = desktopOf(onto);
          try {
            await (api
              ? WindowManagement.setWindowBounds({
                  id,
                  desktopId,
                  bounds: {
                    position: toApi(frame, all[onto]),
                    ...(api.resizable ? { size: { width: frame.width, height: frame.height } } : {}),
                  },
                })
              : moveRaycastWindow(win.title!, toGlobal(frame, all[onto])));
            return undefined;
          } catch (error) {
            const name = api?.application?.name ?? win.title ?? id;
            console.error("move", name, String(error));
            return { id, name };
          }
        }),
      );
      return failed.filter((f) => f !== undefined);
    },
  };
}
