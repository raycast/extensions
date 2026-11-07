// Runs only through macOS's built-in JavaScript for Automation runtime.
// These are native C calls, not UI scripting or Apple Events to another app.
// Private interfaces may change in a future macOS release.
function run(argv) {
  try {
    if (argv.length !== 1 || ["on", "off", "toggle", "status"].indexOf(argv[0]) === -1) {
      throw new Error("Invalid Vehicle Motion Cues operation.");
    }

    ObjC.import("Foundation");
    if (Number($.NSProcessInfo.processInfo.operatingSystemVersion.majorVersion) < 26) {
      throw new Error("Vehicle Motion Cues requires macOS Tahoe 26 or later.");
    }

    ObjC.bindFunction("dlopen", ["void *", ["char *", "int"]]);
    // RTLD_NOW | RTLD_GLOBAL makes the system symbols available to bindFunction.
    $.dlopen(
      "/System/Library/PrivateFrameworks/UniversalAccess.framework/Versions/A/Frameworks/UniversalAccessCore.framework/Versions/A/UniversalAccessCore",
      0x102,
    );
    try {
      ObjC.bindFunction("UAMotionCuesIsSupported", ["bool", []]);
    } catch (_) {
      throw new Error("This macOS version has no compatible motion-cue support check.");
    }
    if (!$.UAMotionCuesIsSupported()) {
      throw new Error("Apple's Vehicle Motion Cues is not supported on this Mac.");
    }

    $.dlopen("/usr/lib/libAccessibility.dylib", 0x102);
    try {
      ObjC.bindFunction("_AXSMotionCuesEnabled", ["bool", []]);
      ObjC.bindFunction("_AXSMotionCuesMode", ["long", []]);
      ObjC.bindFunction("_AXSSetMotionCuesMode", ["void", ["long"]]);
    } catch (_) {
      throw new Error("This macOS version has no compatible Vehicle Motion Cues control.");
    }

    var enabled = Boolean($._AXSMotionCuesEnabled());
    var target = null;
    if (argv[0] !== "status") {
      target = argv[0] === "toggle" ? !enabled : argv[0] === "on";
      // Verified against the native Settings switch: 1 = On, 2 = Off.
      // Changing the mode lets macOS update the service and enabled/active state.
      // Writing the preference file directly does not reliably do that.
      var mode = target ? 1 : 2;
      if (enabled !== target || Number($._AXSMotionCuesMode()) !== mode) {
        $._AXSSetMotionCuesMode(mode);
      }
    }
    return JSON.stringify({
      enabled: Boolean($._AXSMotionCuesEnabled()),
      mode: Number($._AXSMotionCuesMode()),
      requested: target,
    });
  } catch (error) {
    return JSON.stringify({ error: String(error.message || error) });
  }
}
