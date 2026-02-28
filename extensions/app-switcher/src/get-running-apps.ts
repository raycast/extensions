import { LocalStorage } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { RunningApp } from "./types";

// Batch app properties + per-window metadata + resolve paths via NSWorkspace.
// Skips AXMinimized (expensive) -- phase 2 handles that in background.
const FAST_SCRIPT = `(() => {
  ObjC.import("AppKit");
  var ws = $.NSWorkspace.sharedWorkspace;
  var se = Application("System Events");
  var procs = se.processes.whose({ backgroundOnly: false });
  var names = procs.name();
  var bundleIds = procs.bundleIdentifier();
  var frontmosts = procs.frontmost();
  var count = names.length;

  var results = [];
  for (var i = 0; i < count; i++) {
    if (!bundleIds[i]) continue;

    var path = "";
    try {
      var url = ws.URLForApplicationWithBundleIdentifier(bundleIds[i]);
      if (url && url.path) path = ObjC.unwrap(url.path);
    } catch(e) {}

    var procWindows = [];
    try { procWindows = procs[i].windows(); } catch(e) {}
    var windows = [];
    for (var j = 0; j < procWindows.length; j++) {
      var win = procWindows[j];
      var title = "";
      var num = undefined;
      try { title = win.name() || ""; } catch(e) {}
      try { num = win.attributes.byName("AXWindowNumber").value(); } catch(e) {}
      windows.push({
        title: title,
        minimized: false,
        index: j,
        windowNumber: typeof num === "number" ? num : undefined
      });
    }
    results.push({
      name: names[i],
      bundleId: bundleIds[i],
      frontmost: frontmosts[i],
      appPath: path,
      windows: windows
    });
  }
  return JSON.stringify(results);
})()`;

// Phase 2: per-process batch AXMinimized. Returns { bundleId: [bool, bool, ...] }.
const MINIMIZED_SCRIPT = `(() => {
  var se = Application("System Events");
  var procs = se.processes.whose({ backgroundOnly: false });
  var bundleIds = procs.bundleIdentifier();
  var count = bundleIds.length;
  var result = {};

  for (var i = 0; i < count; i++) {
    if (!bundleIds[i]) continue;
    try {
      var vals = procs[i].windows.attributes.byName("AXMinimized").value();
      if (vals && vals.length > 0) {
        var arr = [];
        for (var j = 0; j < vals.length; j++) arr.push(vals[j] === true);
        result[bundleIds[i]] = arr;
      }
    } catch(e) {}
  }
  return JSON.stringify(result);
})()`;

const RUNNING_APPS_CACHE_KEY = "runningAppsCache";
let inMemoryRunningAppsCache: RunningApp[] | null = null;

interface RunningAppsCacheEntry {
  timestamp: number;
  apps: RunningApp[];
}

function isRunningAppsCacheEntry(value: unknown): value is RunningAppsCacheEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "timestamp" in value &&
    "apps" in value &&
    typeof (value as { timestamp: unknown }).timestamp === "number" &&
    Array.isArray((value as { apps: unknown }).apps)
  );
}

export async function getRunningApps(): Promise<RunningApp[]> {
  const result = await runAppleScript(FAST_SCRIPT, { language: "JavaScript" });
  try {
    return JSON.parse(result);
  } catch {
    return [];
  }
}

export async function getCachedRunningApps(): Promise<RunningApp[] | null> {
  if (inMemoryRunningAppsCache) return inMemoryRunningAppsCache;

  const stored = await LocalStorage.getItem<string>(RUNNING_APPS_CACHE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as unknown;

    // Backward compatibility with older cache format (raw array).
    if (Array.isArray(parsed)) {
      inMemoryRunningAppsCache = parsed as RunningApp[];
      return inMemoryRunningAppsCache;
    }

    if (isRunningAppsCacheEntry(parsed)) {
      inMemoryRunningAppsCache = parsed.apps;
      return inMemoryRunningAppsCache;
    }

    return null;
  } catch {
    return null;
  }
}

export async function setCachedRunningApps(apps: RunningApp[]): Promise<void> {
  inMemoryRunningAppsCache = apps;
  const payload: RunningAppsCacheEntry = {
    timestamp: Date.now(),
    apps,
  };
  await LocalStorage.setItem(RUNNING_APPS_CACHE_KEY, JSON.stringify(payload));
}

export async function getMinimizedStatus(): Promise<Record<string, boolean[]>> {
  const result = await runAppleScript(MINIMIZED_SCRIPT, {
    language: "JavaScript",
  });
  try {
    return JSON.parse(result);
  } catch {
    return {};
  }
}
