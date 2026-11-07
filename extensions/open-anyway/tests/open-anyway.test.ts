import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleOpenAnywayFlow } from "../src/open-anyway";
import { GatekeeperHelperResult } from "../src/automation";
import { DetectedAppInfo } from "../src/detector";

describe("handleOpenAnywayFlow", () => {
  it("provides manual navigation when no blocked app is identified", async () => {
    let settingsOpened = false;
    let toastShown = false;

    const outcome = await handleOpenAnywayFlow({
      detectApp: async () => null,
      openSettings: async () => {
        settingsOpened = true;
      },
      notifyToast: async (opts) => {
        toastShown = true;
        assert.equal(opts.title, "No Blocked App Identified");
      },
    });

    assert.equal(outcome, "no_blocked_app");
    assert.equal(settingsOpened, true);
    assert.equal(toastShown, true);
  });

  it("handles target mismatch without activating button and falls back to manual settings", async () => {
    let settingsOpened = false;
    let toastMessage = "";

    const detected: DetectedAppInfo = { name: "RequestedApp", bundleId: "com.test.app" };
    const helperResult: GatekeeperHelperResult = {
      status: "target_mismatch",
      appName: "OtherBlockedApp",
      message: 'Blocked app in Settings ("OtherBlockedApp") does not match target ("RequestedApp").',
      trusted: true,
    };

    const outcome = await handleOpenAnywayFlow({
      detectApp: async () => detected,
      runHelper: async () => helperResult,
      openSettings: async () => {
        settingsOpened = true;
      },
      notifyToast: async (opts) => {
        toastMessage = opts.message || "";
      },
    });

    assert.equal(outcome, "target_mismatch");
    assert.equal(settingsOpened, true);
    assert.ok(toastMessage.includes("does not match target"));
  });

  it("handles unverified target in Settings and falls back to manual settings", async () => {
    let settingsOpened = false;
    const detected: DetectedAppInfo = { name: "RequestedApp" };
    const helperResult: GatekeeperHelperResult = {
      status: "target_unresolved",
      message: "Approval control was found, but the application name could not be verified in System Settings.",
      trusted: true,
    };

    const outcome = await handleOpenAnywayFlow({
      detectApp: async () => detected,
      runHelper: async () => helperResult,
      openSettings: async () => {
        settingsOpened = true;
      },
      notifyToast: async (opts) => {
        assert.equal(opts.title, "Target Verification Failed");
      },
    });

    assert.equal(outcome, "target_unresolved");
    assert.equal(settingsOpened, true);
  });

  it("distinguishes activation failure from control not found and opens Settings", async () => {
    let settingsOpened = false;
    let toastTitle = "";

    const detected: DetectedAppInfo = { name: "SampleApp" };
    const helperResult: GatekeeperHelperResult = {
      status: "activation_failed",
      appName: "SampleApp",
      message: "Found button, but could not activate via Accessibility.",
      trusted: true,
    };

    const outcome = await handleOpenAnywayFlow({
      detectApp: async () => detected,
      runHelper: async () => helperResult,
      openSettings: async () => {
        settingsOpened = true;
      },
      notifyToast: async (opts) => {
        toastTitle = opts.title;
      },
    });

    assert.equal(outcome, "activation_failed");
    assert.equal(toastTitle, "Activation Failed");
    assert.equal(settingsOpened, true);
  });

  it("handles control not found in Settings and opens manual navigation", async () => {
    let settingsOpened = false;
    let toastTitle = "";

    const detected: DetectedAppInfo = { name: "SampleApp" };
    const helperResult: GatekeeperHelperResult = {
      status: "not_found",
      message: "No blocked application currently waiting for 'Open Anyway' approval.",
      trusted: true,
    };

    const outcome = await handleOpenAnywayFlow({
      detectApp: async () => detected,
      runHelper: async () => helperResult,
      openSettings: async () => {
        settingsOpened = true;
      },
      notifyToast: async (opts) => {
        toastTitle = opts.title;
      },
    });

    assert.equal(outcome, "not_found");
    assert.equal(toastTitle, "Approval Control Not Found");
    assert.equal(settingsOpened, true);
  });

  it("handles permission denied and guides user to grant Accessibility", async () => {
    let settingsOpened = false;
    let toastTitle = "";

    const detected: DetectedAppInfo = { name: "SampleApp" };
    const helperResult: GatekeeperHelperResult = {
      status: "permission_denied",
      message: "Accessibility permission is required.",
      trusted: false,
    };

    const outcome = await handleOpenAnywayFlow({
      detectApp: async () => detected,
      runHelper: async () => helperResult,
      openSettings: async () => {
        settingsOpened = true;
      },
      notifyToast: async (opts) => {
        toastTitle = opts.title;
      },
    });

    assert.equal(outcome, "permission_denied");
    assert.equal(toastTitle, "Accessibility Permission Required");
    assert.equal(settingsOpened, true);
  });

  it("displays HUD on successful activation prompting user for native confirmation", async () => {
    let hudMessage = "";
    const detected: DetectedAppInfo = { name: "CoolApp" };
    const helperResult: GatekeeperHelperResult = {
      status: "success",
      appName: "CoolApp",
      message: "Activated Gatekeeper approval.",
      trusted: true,
    };

    const outcome = await handleOpenAnywayFlow({
      detectApp: async () => detected,
      runHelper: async () => helperResult,
      notifyHUD: async (msg) => {
        hudMessage = msg;
      },
    });

    assert.equal(outcome, "success");
    assert.ok(hudMessage.includes("Activated Open Anyway for \"CoolApp\""));
    assert.ok(hudMessage.includes("Apple's native confirmation"));
  });

  it("displays HUD when confirmation prompt is already pending", async () => {
    let hudMessage = "";
    const detected: DetectedAppInfo = { name: "CoolApp" };
    const helperResult: GatekeeperHelperResult = {
      status: "confirmation_pending",
      appName: "CoolApp",
      message: "Apple confirmation dialog already active.",
      trusted: true,
    };

    const outcome = await handleOpenAnywayFlow({
      detectApp: async () => detected,
      runHelper: async () => helperResult,
      notifyHUD: async (msg) => {
        hudMessage = msg;
      },
    });

    assert.equal(outcome, "confirmation_pending");
    assert.ok(hudMessage.includes("Apple confirmation prompt is active"));
  });

  it("catches unexpected exceptions and surfaces error toast", async () => {
    let toastTitle = "";
    const outcome = await handleOpenAnywayFlow({
      detectApp: async () => {
        throw new Error("Crash in detection");
      },
      notifyToast: async (opts) => {
        toastTitle = opts.title;
      },
    });

    assert.equal(outcome, "error");
    assert.equal(toastTitle, "Open Anyway Error");
  });
});
