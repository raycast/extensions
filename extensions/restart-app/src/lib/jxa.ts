/*
 * JXA sources executed through /usr/bin/osascript. They only use AppKit
 * (NSWorkspace / NSRunningApplication), so no Apple Events or Automation
 * permission is required. Inputs arrive through argv, never by interpolation.
 */

const HELPERS = `
ObjC.import("AppKit");
function isNil(value) {
  return value === undefined || value === null || (typeof value.isNil === "function" && value.isNil());
}
function str(value) {
  if (isNil(value)) return null;
  var unwrapped = ObjC.unwrap(value);
  return typeof unwrapped === "string" ? unwrapped : null;
}
function urlPath(url) {
  return isNil(url) ? null : str(url.path);
}
function describe(app) {
  return {
    pid: Number(app.processIdentifier),
    name: str(app.localizedName),
    bundleId: str(app.bundleIdentifier),
    bundlePath: urlPath(app.bundleURL),
    executablePath: urlPath(app.executableURL),
    activationPolicy: Number(app.activationPolicy),
    terminated: app.isTerminated === true
  };
}
`;

/** Prints a JSON array describing every running application. */
export const LIST_APPS_SCRIPT = `${HELPERS}
function run() {
  var apps = $.NSWorkspace.sharedWorkspace.runningApplications;
  var result = [];
  for (var i = 0; i < apps.count; i++) {
    result.push(describe(apps.objectAtIndex(i)));
  }
  return JSON.stringify(result);
}
`;

/**
 * argv: [pid, bundlePath, executablePath, "graceful" | "force"]
 * Re-validates the PID against the exact bundle and executable paths immediately
 * before asking AppKit to terminate it, so a reused or relaunched PID is never killed.
 * Prints {"status":"requested"|"refused"|"stale","detail"?:string}.
 */
export const TERMINATE_APP_SCRIPT = `${HELPERS}
function run(argv) {
  var pid = parseInt(argv[0], 10);
  var app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(pid);
  if (isNil(app) || app.isTerminated === true) {
    return JSON.stringify({ status: "stale", detail: "process " + pid + " is no longer running" });
  }
  var info = describe(app);
  if (info.bundlePath !== argv[1] || info.executablePath !== argv[2]) {
    return JSON.stringify({ status: "stale", detail: "process " + pid + " now belongs to " + (info.bundlePath || "another program") });
  }
  var accepted = argv[3] === "force" ? app.forceTerminate : app.terminate;
  return JSON.stringify({ status: accepted === true ? "requested" : "refused" });
}
`;
