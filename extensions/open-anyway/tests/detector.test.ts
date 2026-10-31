import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseGatekeeperEvents,
  resolveAppNameFromBundleId,
  detectRecentBlockedApp,
  UnifiedLogEvent,
} from "../src/detector";

describe("parseGatekeeperEvents", () => {
  it("returns null for empty or non-array inputs", () => {
    assert.equal(parseGatekeeperEvents([]), null);
    // @ts-expect-error test invalid input
    assert.equal(parseGatekeeperEvents(null), null);
  });

  it("extracts candidate from a single addition event", () => {
    const events: UnifiedLogEvent[] = [
      {
        timestamp: "2026-10-27 15:51:58.008784+0530",
        eventMessage:
          "Adding Gatekeeper denial breadcrumb (open): PST: (path: 9ecfec0bb6ea4594), (team: (null)), (id: com.example.BlockedApp), (bundle_id: com.example.BlockedApp)",
      },
    ];

    const result = parseGatekeeperEvents(events);
    assert.ok(result);
    assert.equal(result.bundleId, "com.example.BlockedApp");
    assert.equal(result.pathKey, "9ecfec0bb6ea4594");
    assert.equal(result.timestamp, "2026-10-27 15:51:58.008784+0530");
  });

  it("rejects denial breadcrumbs with (bundle_id: (null)) as invalid bundle ID", () => {
    const events: UnifiedLogEvent[] = [
      {
        timestamp: "2026-10-27 15:51:58.008784+0530",
        eventMessage:
          "Adding Gatekeeper denial breadcrumb (open): PST: (path: (null)), (team: (null)), (id: (null)), (bundle_id: (null))",
      },
    ];

    const result = parseGatekeeperEvents(events);
    assert.equal(result, null);
  });

  it("returns null if the denial breadcrumb was subsequently cleared", () => {
    const events: UnifiedLogEvent[] = [
      {
        timestamp: "2026-10-27 15:51:58.008784+0530",
        eventMessage:
          "Adding Gatekeeper denial breadcrumb (open): PST: (path: 9ecfec0bb6ea4594), (team: (null)), (id: com.example.BlockedApp), (bundle_id: com.example.BlockedApp)",
      },
      {
        timestamp: "2026-10-27 15:52:04.166293+0530",
        eventMessage:
          "Clearing Gatekeeper denial breadcrumb: PST: (path: 9ecfec0bb6ea4594), (team: (null)), (id: (null)), (bundle_id: (null))",
      },
    ];

    const result = parseGatekeeperEvents(events);
    assert.equal(result, null);
  });

  it("returns the latest uncleared candidate when multiple apps were evaluated", () => {
    const events: UnifiedLogEvent[] = [
      {
        timestamp: "2026-10-27 15:40:00.000000+0530",
        eventMessage:
          "Adding Gatekeeper denial breadcrumb (open): PST: (path: path1), (team: (null)), (id: com.example.FirstApp), (bundle_id: com.example.FirstApp)",
      },
      {
        timestamp: "2026-10-27 15:45:00.000000+0530",
        eventMessage:
          "Adding Gatekeeper denial breadcrumb (open): PST: (path: path2), (team: (null)), (id: com.example.SecondApp), (bundle_id: com.example.SecondApp)",
      },
      {
        timestamp: "2026-10-27 15:46:00.000000+0530",
        eventMessage: "Clearing Gatekeeper denial breadcrumb: PST: (path: path1)",
      },
    ];

    const result = parseGatekeeperEvents(events);
    assert.ok(result);
    assert.equal(result.bundleId, "com.example.SecondApp");
    assert.equal(result.pathKey, "path2");
  });
});

describe("resolveAppNameFromBundleId", () => {
  it("resolves display name using Spotlight mdfind and mdls", async () => {
    const mockRunner = async (file: string, args: string[]) => {
      if (file === "mdfind") {
        return { stdout: "/Applications/TestApp.app\n", stderr: "" };
      }
      if (file === "mdls") {
        return { stdout: "Test Application\n", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    };

    const resolved = await resolveAppNameFromBundleId("com.test.app", mockRunner);
    assert.ok(resolved);
    assert.equal(resolved.displayName, "Test Application");
    assert.equal(resolved.appPath, "/Applications/TestApp.app");
  });

  it("falls back to file basename if mdls fails", async () => {
    const mockRunner = async (file: string) => {
      if (file === "mdfind") {
        return { stdout: "/Applications/AwesomeTool.app\n", stderr: "" };
      }
      if (file === "mdls") {
        throw new Error("mdls failed");
      }
      return { stdout: "", stderr: "" };
    };

    const resolved = await resolveAppNameFromBundleId("com.test.awesome", mockRunner);
    assert.ok(resolved);
    assert.equal(resolved.displayName, "AwesomeTool");
    assert.equal(resolved.appPath, "/Applications/AwesomeTool.app");
  });

  it("returns null when no .app is found in Spotlight (never guesses from bundle ID suffix)", async () => {
    const mockRunner = async () => {
      return { stdout: "", stderr: "" };
    };

    const resolved = await resolveAppNameFromBundleId("com.company.GreatUtility", mockRunner);
    assert.equal(resolved, null);
  });

  it("returns null for null, empty, nil, or malformed bundle identifiers", async () => {
    const mockRunner = async () => {
      return { stdout: "", stderr: "" };
    };

    assert.equal(await resolveAppNameFromBundleId("(null)", mockRunner), null);
    assert.equal(await resolveAppNameFromBundleId("(null", mockRunner), null);
    assert.equal(await resolveAppNameFromBundleId("null", mockRunner), null);
    assert.equal(await resolveAppNameFromBundleId("nil", mockRunner), null);
    assert.equal(await resolveAppNameFromBundleId("", mockRunner), null);
    assert.equal(await resolveAppNameFromBundleId("   ", mockRunner), null);
    assert.equal(await resolveAppNameFromBundleId("singleword", mockRunner), null);
  });

  it("correctly resolves display name differing from bundle ID suffix when Spotlight succeeds", async () => {
    const mockRunner = async (file: string, args: string[]) => {
      if (file === "mdfind") {
        return { stdout: "/Applications/VLC.app\n", stderr: "" };
      }
      if (file === "mdls") {
        return { stdout: "VLC media player\n", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    };

    const resolved = await resolveAppNameFromBundleId("org.videolan.vlc", mockRunner);
    assert.ok(resolved);
    assert.equal(resolved.displayName, "VLC media player");
    assert.equal(resolved.appPath, "/Applications/VLC.app");
  });

  it("rejects dangerous or command-injection characters in bundleId without invoking runner", async () => {
    let runnerCalled = false;
    const mockRunner = async () => {
      runnerCalled = true;
      return { stdout: "", stderr: "" };
    };

    const resolved = await resolveAppNameFromBundleId('com.test.app"; rm -rf /; "', mockRunner);
    assert.equal(resolved, null);
    assert.equal(runnerCalled, false);
  });

  it("returns null for empty or all-special-character bundleId", async () => {
    const mockRunner = async () => {
      return { stdout: "", stderr: "" };
    };

    const resolved = await resolveAppNameFromBundleId("!@#$%^&*()", mockRunner);
    assert.equal(resolved, null);
  });
});

describe("detectRecentBlockedApp", () => {
  it("returns null when no logs match", async () => {
    const mockRunner = async () => {
      return { stdout: "[]", stderr: "" };
    };

    const detected = await detectRecentBlockedApp({ runner: mockRunner });
    assert.equal(detected, null);
  });

  it("returns parsed detected app when active denial is in log", async () => {
    const logJson = JSON.stringify([
      {
        timestamp: "2026-10-27 15:51:58.008784+0530",
        eventMessage:
          "Adding Gatekeeper denial breadcrumb (open): PST: (path: abc123), (bundle_id: com.vendor.SampleApp)",
      },
    ]);

    const mockRunner = async (file: string) => {
      if (file === "log") {
        return { stdout: logJson, stderr: "" };
      }
      if (file === "mdfind") {
        return { stdout: "/Applications/SampleApp.app\n", stderr: "" };
      }
      if (file === "mdls") {
        return { stdout: "Sample App\n", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    };

    const detected = await detectRecentBlockedApp({ runner: mockRunner });
    assert.ok(detected);
    assert.equal(detected.name, "Sample App");
    assert.equal(detected.bundleId, "com.vendor.SampleApp");
  });

  it("gracefully catches runner exceptions and returns null without throwing", async () => {
    const mockRunner = async () => {
      throw new Error("Command timed out");
    };

    const detected = await detectRecentBlockedApp({ runner: mockRunner });
    assert.equal(detected, null);
  });
});
