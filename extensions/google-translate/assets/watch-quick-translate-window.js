// Run by macOS's JavaScript for Automation runtime, not by Raycast's Node process.
// Only window metadata is read; no screen contents or window titles are needed.
function createWindowTracker(owner, deadline) {
  var trackedWindow;

  function isCandidate(window) {
    var bounds = window.kCGWindowBounds || {};
    return (
      window.kCGWindowOwnerPID === owner && window.kCGWindowAlpha > 0 && bounds.Width >= 400 && bounds.Height >= 100
    );
  }

  return function (windows, now) {
    if (trackedWindow !== undefined) {
      for (var i = 0; i < windows.length; i++) {
        if (windows[i].kCGWindowNumber === trackedWindow && isCandidate(windows[i])) return "waiting";
      }
      return "closed";
    }

    for (var j = 0; j < windows.length; j++) {
      if (isCandidate(windows[j])) {
        trackedWindow = windows[j].kCGWindowNumber;
        break;
      }
    }
    return now >= deadline && trackedWindow === undefined ? "unavailable" : "waiting";
  };
}

function run(argv) {
  ObjC.import("AppKit");
  ObjC.import("CoreGraphics");
  ObjC.bindFunction("kill", ["int", ["int", "int"]]);

  var applications = $.NSRunningApplication.runningApplicationsWithBundleIdentifier("com.raycast.macos");
  if (Number(applications.count) === 0) return "";

  var parent = Number(argv[0]);
  var owner = Number(applications.objectAtIndex(0).processIdentifier);
  var update = createWindowTracker(owner, Date.now() + 5000);
  while (Number($.kill(parent, 0)) === 0) {
    // optionOnScreenOnly (1) | excludeDesktopElements (16).
    var windows = ObjC.deepUnwrap($.CGWindowListCopyWindowInfo(17, 0)) || [];
    var state = update(windows, Date.now());
    if (state !== "waiting") return state === "closed" ? "closed" : "";
    $.NSThread.sleepForTimeInterval(0.1);
  }
  return "";
}

// Keep the state transitions testable without importing macOS frameworks.
if (typeof module !== "undefined") module.exports = { createWindowTracker };
