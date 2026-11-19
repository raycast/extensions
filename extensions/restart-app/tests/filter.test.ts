import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countInstances, exclusionReason, selectRestartableApps } from "../src/lib/filter.ts";
import type { RawRunningApp } from "../src/lib/types.ts";

function raw(name: string, overrides: Partial<RawRunningApp> = {}): RawRunningApp {
  const bundlePath = `/Applications/${name}.app`;
  return {
    pid: 100,
    name,
    bundleId: `com.example.${name.replace(/\s/g, "")}`,
    bundlePath,
    executablePath: `${bundlePath}/Contents/MacOS/${name}`,
    activationPolicy: 0,
    terminated: false,
    ...overrides,
  };
}

describe("exclusionReason", () => {
  it("keeps regular and accessory apps", () => {
    assert.equal(exclusionReason(raw("Safari")), null);
    assert.equal(exclusionReason(raw("Bartender", { activationPolicy: 1 })), null);
    assert.equal(
      exclusionReason(
        raw("Notes", {
          bundlePath: "/System/Applications/Notes.app",
          executablePath: "/System/Applications/Notes.app/Contents/MacOS/Notes",
        }),
      ),
      null,
    );
  });

  it("excludes background-only processes", () => {
    assert.equal(exclusionReason(raw("Daemon", { activationPolicy: 2 })), "background process");
  });

  it("excludes Raycast and Finder", () => {
    assert.equal(exclusionReason(raw("Raycast", { bundleId: "com.raycast.macos" })), "Raycast");
    assert.equal(exclusionReason(raw("Finder", { bundleId: "com.apple.finder" })), "system UI");
  });

  it("excludes OS components and embedded helpers", () => {
    const coreServices = "/System/Library/CoreServices/ControlStrip.app";
    assert.equal(
      exclusionReason(
        raw("ControlStrip", {
          bundleId: "com.apple.controlstrip",
          bundlePath: coreServices,
          executablePath: `${coreServices}/Contents/MacOS/ControlStrip`,
        }),
      ),
      "system component",
    );
    const helper = "/Applications/Slack.app/Contents/Frameworks/Slack Helper.app";
    assert.equal(
      exclusionReason(
        raw("Slack Helper", { bundlePath: helper, executablePath: `${helper}/Contents/MacOS/Slack Helper` }),
      ),
      "embedded helper",
    );
    const updater = "/Users/me/Library/Caches/com.example.thing/org.sparkle-project.Sparkle/Launcher/x/Updater.app";
    assert.equal(
      exclusionReason(raw("Updater", { bundlePath: updater, executablePath: `${updater}/Contents/MacOS/Updater` })),
      "transient helper",
    );
  });

  it("keeps app bundles in user and temporary locations", () => {
    const qa = "/private/tmp/qa/Restart QA.app";
    assert.equal(
      exclusionReason(raw("Restart QA", { bundlePath: qa, executablePath: `${qa}/Contents/MacOS/QA` })),
      null,
    );
  });

  it("excludes entries without a usable bundle", () => {
    assert.equal(exclusionReason(raw("Tool", { bundleId: null })), "no bundle identifier");
    assert.equal(exclusionReason(raw("Tool", { bundlePath: null })), "no bundle location");
    assert.equal(
      exclusionReason(raw("Tool", { bundlePath: "/usr/local/bin/tool", executablePath: "/usr/local/bin/tool" })),
      "not an app bundle",
    );
    assert.equal(exclusionReason(raw("Tool", { executablePath: "/tmp/tool" })), "executable outside bundle");
    assert.equal(exclusionReason(raw("Tool", { terminated: true })), "terminated");
  });
});

describe("selectRestartableApps", () => {
  it("filters, names, classifies and sorts by name then PID", () => {
    const apps = selectRestartableApps([
      raw("zed", { pid: 3 }),
      raw("Arc", { pid: 9 }),
      raw("Arc", { pid: 2 }),
      raw("Menu", { pid: 4, activationPolicy: 1, name: null }),
      raw("Finder", { pid: 5, bundleId: "com.apple.finder" }),
    ]);

    assert.deepEqual(
      apps.map((app) => [app.name, app.pid, app.kind]),
      [
        ["Arc", 2, "regular"],
        ["Arc", 9, "regular"],
        ["Menu", 4, "accessory"],
        ["zed", 3, "regular"],
      ],
    );
    assert.equal(countInstances(apps).get("com.example.arc"), 2);
  });
});
