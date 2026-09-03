import assert from "node:assert/strict";
import test from "node:test";
import {
  accessibilitySettingsURL,
  classifyLaunchctlPrintFailure,
  inputMonitoringSettingsURL,
  inspectCodesignIdentity,
  launchAgentPlist,
  canStart,
  permissionState,
  repairDisposition,
} from "../src/adapters/macos/helper-lifecycle";

test("escapes every path interpolated into the LaunchAgent plist", () => {
  const plist = launchAgentPlist({
    installedExecutable: "/tmp/a&b<mouse>",
    config: "/tmp/profile'quote.json",
    state: '/tmp/state"quote.json',
    permissionMarker: "/tmp/permission",
    launchAgent: "/tmp/agent.plist",
    label: "com.example.&<mouse>",
    stdoutLog: "/tmp/out&log",
    stderrLog: "/tmp/error&log",
  });
  assert.match(plist, /a&amp;b&lt;mouse&gt;/);
  assert.match(plist, /profile&apos;quote/);
  assert.match(plist, /state&quot;quote/);
  assert.doesNotMatch(plist, /<string>\/tmp\/a&b<mouse><\/string>/);
});

test("maps only known launchctl absence to bootstrap and preserves real errors", () => {
  assert.equal(classifyLaunchctlPrintFailure("Could not find service in domain"), "missing");
  assert.equal(classifyLaunchctlPrintFailure("No such process"), "missing");
  assert.equal(classifyLaunchctlPrintFailure("Input/output error"), "failed");
});

test("accepts only Apple signing authority with a team and rejects installed-path mismatch", () => {
  const signed =
    "Authority=Apple Development: Example (TEAM123)\nTeamIdentifier=TEAM123\nIdentifier=com.brandon.mouse-scroll-per-device.helper";
  assert.equal(
    inspectCodesignIdentity(signed, "/Library/Application Support/MouseScrollPerDevice/bin/mouse-scroll-helper").state,
    "valid",
  );
  assert.equal(
    inspectCodesignIdentity(
      "Authority=Apple Development: Example\nTeamIdentifier=TEAM123\nIdentifier=wrong.helper",
      "/tmp/helper",
    ).state,
    "invalid",
  );
  assert.equal(inspectCodesignIdentity("Signature=adhoc\nTeamIdentifier=not set", "/tmp/helper").state, "invalid");
  assert.equal(
    inspectCodesignIdentity(
      "Authority=Apple Development: Example\nTeamIdentifier=not set\nIdentifier=com.brandon.mouse-scroll-per-device.helper",
      "/tmp/helper",
    ).state,
    "invalid",
  );
  assert.equal(
    inspectCodesignIdentity(
      "Authority=Apple Development: Example\nTeamIdentifier=TEAM123\nIdentifier=com.brandon.mouse-scroll-per-device.helper.evil",
      "/tmp/helper",
    ).state,
    "invalid",
  );
  assert.equal(
    inspectCodesignIdentity(
      signed,
      "/tmp/helper",
      "/Library/Application Support/MouseScrollPerDevice/bin/mouse-scroll-helper",
    ).state,
    "pathMismatch",
  );
});

test("uses explicit macOS Settings destinations without opening them in tests", () => {
  assert.match(inputMonitoringSettingsURL, /Privacy_ListenEvent/);
  assert.match(accessibilitySettingsURL, /Privacy_Accessibility/);
});

test("models prompt grace, later denial, grants, start gate, and safe repair", () => {
  assert.equal(permissionState(false, true, 0), "notDetermined");
  assert.equal(permissionState(false, true, 30_001), "denied");
  assert.equal(permissionState(true, true, 0), "granted");
  assert.equal(canStart("stopped", { inputMonitoring: "granted", accessibility: "granted" }), true);
  assert.equal(canStart("stopped", { inputMonitoring: "granted", accessibility: "denied" }), false);
  assert.equal(repairDisposition("stale"), "stopThenInstall");
  assert.equal(repairDisposition("identityMismatch"), "refuse");
});
