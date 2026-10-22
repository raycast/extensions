// JXA run through osascript. Scanning and moving are split so the geometry
// lives in plain TypeScript (see geometry.ts) and can be tested off macOS.

import { type Move, pickWindow } from "./geometry";

// Automation denied (-1743) or no Accessibility access (-25211). These must
// reach friendlyError instead of being swallowed per window.
const PERMISSION_ERROR = String.raw`/-1743|-25211|assistive access|not authori[sz]ed/i`;

/**
 * Returns JSON: { screens, windows, dock }
 * Screens come from NSScreen and are flipped to Accessibility coordinates
 * (top-left origin of the main display) so they match System Events.
 *
 * Windows come from CGWindowListCopyWindowInfo, which is a single in-process
 * call. Asking System Events for every app's windows costs an Apple Event per
 * property per app and easily takes 30s+ with a normal number of apps open.
 * The on-screen list already leaves out minimized windows and fullscreen
 * windows on other Spaces; CG bounds use the same top-left coordinates as AX.
 * CG has no AX window index, so index is -1 and applyScript matches on frame.
 */
export const SCAN_SCRIPT = `
function run() {
  ObjC.import("AppKit");
  ObjC.import("CoreGraphics");

  const ns = $.NSScreen.screens.js;
  const mainH = ns[0].frame.size.height;
  const flip = (r) => ({ x: r.origin.x, y: mainH - (r.origin.y + r.size.height), w: r.size.width, h: r.size.height });
  const screens = ns.map((s) => ({ frame: flip(s.frame), visible: flip(s.visibleFrame) }));

  let dock = null;
  try {
    const list = Application("System Events").applicationProcesses.byName("Dock").uiElements[0];
    const p = list.position();
    const s = list.size();
    dock = { x: p[0], y: p[1], w: s[0], h: s[1] };
  } catch (e) {
    if (${PERMISSION_ERROR}.test(String(e))) throw e;
  }

  const opts = $.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements;
  const info = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(opts, $.kCGNullWindowID))) || [];

  const windows = [];
  for (const w of info) {
    // Layer 0 is normal app windows; menus, panels and overlays sit higher.
    if (w.kCGWindowLayer !== 0 || !w.kCGWindowBounds) continue;
    if (w.kCGWindowAlpha !== undefined && w.kCGWindowAlpha <= 0) continue;
    const b = w.kCGWindowBounds;
    windows.push({
      pid: w.kCGWindowOwnerPID,
      app: w.kCGWindowOwnerName || "",
      index: -1,
      title: w.kCGWindowName || "",
      frame: { x: b.X, y: b.Y, w: b.Width, h: b.Height },
      minimized: false,
      fullscreen: false,
    });
  }

  return JSON.stringify({ screens: screens, windows: windows, dock: dock });
}
`;

/** Returns JSON: { ok: number, failed: string[] } */
export function applyScript(moves: Move[]): string {
  return `
function run() {
  const moves = ${JSON.stringify(moves)};
  const se = Application("System Events");
  const pickWindow = ${pickWindow.toString()};
  let ok = 0;
  const failed = [];
  const byPid = {};

  for (const m of moves) {
    try {
      // One lookup per app: every Apple Event against System Events is slow.
      if (!byPid[m.pid]) {
        const wins = se.applicationProcesses.whose({ unixId: m.pid })[0].windows;
        byPid[m.pid] = { wins: wins, pos: wins.position(), size: wins.size(), used: [] };
      }
      const app = byPid[m.pid];
      const idx = pickWindow(app.pos, app.size, m.from, m.index, app.used);
      if (idx < 0) continue; // user moved it in the meantime, leave it
      app.used.push(idx);

      const w = app.wins[idx];
      const resize = m.to.w !== m.from.w || m.to.h !== m.from.h;
      if (resize) w.size = [m.to.w, m.to.h];
      w.position = [m.to.x, m.to.y];
      if (resize) w.size = [m.to.w, m.to.h]; // some apps clamp size against the old position
      ok++;
    } catch (e) {
      if (${PERMISSION_ERROR}.test(String(e))) throw e;
      failed.push(m.app);
    }
  }

  return JSON.stringify({ ok: ok, failed: failed });
}
`;
}
