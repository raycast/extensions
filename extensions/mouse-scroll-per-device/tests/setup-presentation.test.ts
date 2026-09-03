import assert from "node:assert/strict";
import test from "node:test";
import {
  ambiguousIdentityPresentation,
  helperActionPresentation,
  helperSetupPresentation,
} from "../src/application/setup-presentation";

const permissions = { inputMonitoring: "notDetermined", accessibility: "denied" } as const;

test("presents setup status and avoids treating running status as physical verification", () => {
  const running = helperSetupPresentation({ state: "running", permissions });
  assert.equal(running.title, "Helper Running");
  assert.match(running.detail, /not physical scroll verification/);
  assert.match(running.detail, /Input Monitoring: Not Set Up/);
  assert.match(running.detail, /Accessibility: Needs Approval/);
});

test("presents safe recovery language for helper identity and ambiguous mice", () => {
  const mismatch = helperSetupPresentation({ state: "identityMismatch", permissions });
  assert.equal(mismatch.title, "Helper Runtime Mismatch");
  assert.match(mismatch.detail, /does not match/);
  const ambiguous = ambiguousIdentityPresentation();
  assert.equal(ambiguous.title, "Profile Unavailable for This Mouse");
  assert.match(ambiguous.detail, /stable serial number or location ID/);
});

test("orders setup actions by helper lifecycle and permission state", () => {
  assert.deepEqual(helperActionPresentation({ state: "notInstalled", permissions }), [
    { kind: "install", title: "Install Helper" },
    { kind: "refresh", title: "Refresh Status" },
  ]);
  assert.deepEqual(helperActionPresentation({ state: "stopped", permissions }), [
    { kind: "openAccessibility", title: "Open Accessibility Settings" },
    { kind: "refresh", title: "Refresh Status" },
  ]);
  assert.deepEqual(
    helperActionPresentation({
      state: "running",
      permissions: { inputMonitoring: "granted", accessibility: "granted" },
    }),
    [
      { kind: "stop", title: "Stop Helper" },
      { kind: "refresh", title: "Refresh Status" },
    ],
  );
  assert.deepEqual(helperActionPresentation({ state: "identityMismatch", permissions }), [
    { kind: "repair", title: "Repair Helper" },
    { kind: "refresh", title: "Refresh Status" },
  ]);
  assert.deepEqual(helperActionPresentation({ state: "packagedIdentityInvalid", permissions }), [
    { kind: "signingGuidance", title: "View Signing Requirements" },
    { kind: "refresh", title: "Refresh Status" },
  ]);
});
