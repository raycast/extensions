import { PopToRootType, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
export type Studio = { pid: number; title: string };

const discoveryScript = `
ObjC.import("CoreGraphics");
var events = Application("System Events");
var ids = events.applicationProcesses.whose({bundleIdentifier: "com.Roblox.RobloxStudio"}).unixId();
var windows = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(0, 0)));
var order = [];
windows.forEach(function(window) {
  var pid = window.kCGWindowOwnerPID;
  if (window.kCGWindowLayer === 0 && window.kCGWindowIsOnscreen &&
      window.kCGWindowAlpha > 0 && window.kCGWindowBounds.Height > 50 &&
      ids.indexOf(pid) !== -1 && order.indexOf(pid) === -1) order.push(pid);
});
ids.forEach(function(pid) { if (order.indexOf(pid) === -1) order.push(pid); });
JSON.stringify(order.map(function(pid) {
  var title = "Roblox Studio";
  try { title = events.applicationProcesses.whose({unixId: pid})[0].windows[0].name(); } catch (_) {}
  return {pid: pid, title: title.replace(/ - Roblox Studio$/, "")};
}));
`;

export function errorMessage(error: unknown): string {
  const failure = error as Error & { stderr?: string };
  if (
    /-1743|-1719|assistive access|not authorized/i.test(failure.stderr ?? "")
  ) {
    return "Allow Raycast Accessibility and Automation access in System Settings";
  }
  return failure.stderr
    ? "Couldn't access Studio — check its File menu"
    : failure.message;
}

export async function publish(studio: Studio) {
  try {
    await exec(
      "/usr/bin/osascript",
      [
        "-e",
        `
        tell application "System Events"
          tell (first application process whose unix id is ${studio.pid})
            if not (enabled of menu item "Publish to Roblox" of menu "File" of menu bar 1) then
              error "Publish to Roblox is unavailable in the selected Studio instance"
            end if
            perform action "AXPress" of menu item "Publish to Roblox" of menu "File" of menu bar 1
          end tell
        end tell
      `,
      ],
      { timeout: 30_000 },
    );
  } catch (error) {
    await showHUD(errorMessage(error), {
      popToRootType: PopToRootType.Immediate,
    });
    return;
  }
  await showHUD(`Publishing ${studio.title}...`, {
    popToRootType: PopToRootType.Immediate,
  });
}

export async function getStudios(): Promise<Studio[]> {
  const { stdout } = await exec(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", discoveryScript],
    { timeout: 30_000 },
  );
  const studios: Studio[] = JSON.parse(stdout);
  const ranked = await Promise.all(
    studios.map(async (studio) => {
      // Launch Services increments this sequence when an app becomes frontmost.
      // Window stacking is unreliable for Studio's floating and hidden windows.
      try {
        const { stdout: activity } = await exec(
          "/usr/bin/lsappinfo",
          ["-all", "info", "-only", "LSFrontApplicationSeed", `#${studio.pid}`],
          { timeout: 5_000 },
        );
        const sequence = Number(
          activity.match(/"LSFrontApplicationSeed"\s*=\s*(\d+)/)?.[1] ?? 0,
        );
        return { studio, sequence };
      } catch {
        return { studio, sequence: 0 };
      }
    }),
  );
  return ranked
    .sort((a, b) => b.sequence - a.sequence)
    .map(({ studio }) => studio);
}
