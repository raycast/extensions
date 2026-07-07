import assert from "node:assert/strict";
import test from "node:test";
import { getInstalledSafariApps } from "../src/safari-apps.ts";

test("returns installed known Safari variants in display order", async () => {
  const installedPaths = new Set([
    "/Applications/Safari.app",
    "/Applications/Safari Technology Preview.app",
    "/Applications/Safari Nightly.app",
  ]);

  const apps = await getInstalledSafariApps(async (path) => installedPaths.has(path), [
    "/Applications",
    "/Users/tester/Applications",
  ]);

  assert.deepEqual(apps, [
    {
      id: "safari",
      name: "Safari",
      path: "/Applications/Safari.app",
      bundleIdentifier: "com.apple.Safari",
    },
    {
      id: "safari-technology-preview",
      name: "Safari Technology Preview",
      path: "/Applications/Safari Technology Preview.app",
      bundleIdentifier: "com.apple.SafariTechnologyPreview",
    },
    {
      id: "safari-nightly",
      name: "Safari Nightly",
      path: "/Applications/Safari Nightly.app",
      bundleIdentifier: "com.apple.Safari",
    },
  ]);
});

test("falls back to user Applications when a variant is not in /Applications", async () => {
  const installedPaths = new Set(["/Users/tester/Applications/Safari Nightly.app"]);

  const apps = await getInstalledSafariApps(async (path) => installedPaths.has(path), [
    "/Applications",
    "/Users/tester/Applications",
  ]);

  assert.deepEqual(apps, [
    {
      id: "safari-nightly",
      name: "Safari Nightly",
      path: "/Users/tester/Applications/Safari Nightly.app",
      bundleIdentifier: "com.apple.Safari",
    },
  ]);
});
