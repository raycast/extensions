import { run } from "./exec";
import type { AppRow } from "./types";

/* 可见窗口 PID（界面分类依据）。用 CGWindowList 而不是 AppleScript 枚举进程，
   因为只有它能区分「有窗口」和「只有进程」。

   ponytail: 只保留 mac 的 JXA 分支，去掉 win32 的 user32 P/Invoke 脚本。 */

const MAC_JXA = String.raw`
ObjC.import('Cocoa');
function run() {
  const options = $.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements;
  const raw = $.CGWindowListCopyWindowInfo(options, $.kCGNullWindowID);
  const pids = [];
  const count = Number($.CFArrayGetCount(raw));
  for (let index = 0; index < count; index++) {
    const window = ObjC.castRefToObject($.CFArrayGetValueAtIndex(raw, index));
    const pid = Number(window.objectForKey($('kCGWindowOwnerPID')).js);
    const layer = Number(window.objectForKey($('kCGWindowLayer')).js);
    const alpha = Number(window.objectForKey($('kCGWindowAlpha')).js);
    const bounds = ObjC.deepUnwrap(window.objectForKey($('kCGWindowBounds'))) || {};
    if (Number.isInteger(pid) && pid > 0 && layer === 0 && alpha > 0 &&
        Number(bounds.Width) > 1 && Number(bounds.Height) > 1) pids.push(pid);
  }
  return JSON.stringify([...new Set(pids)]);
}`;

export function parsePidJson(text: string): number[] {
  const value = JSON.parse(text || "null");
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(list.map(Number).filter((pid) => Number.isInteger(pid) && pid > 0))];
}

/** 失败即界面分类不可用（抛错），调用方不要把它当成「没有窗口」。 */
export function getVisibleWindowPids(): Promise<number[]> {
  return run("/usr/bin/osascript", ["-l", "JavaScript", "-e", MAC_JXA], 2000).then(parsePidJson);
}

/** 组内任一 PID 有可见窗口即算界面应用。 */
export function markVisibleWindows(rows: AppRow[], pids: readonly number[]): void {
  const visible = new Set(pids);
  for (const row of rows) {
    row.hasWindow = (row.allPids.length ? row.allPids : [row.pid]).some((pid) => visible.has(pid));
  }
}
