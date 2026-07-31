import test from "node:test";
import assert from "node:assert/strict";
import {
  canApplicationOpenWebUrls,
  filterWebUrlApplications,
  getActiveBrowserAfterRaycastCloses,
  getUrlOpenApplication,
  isRaycastApplication,
  shouldResolveActiveBrowser,
} from "../src/browser-utils.ts";
import type { Application } from "@raycast/api";

function app(input: Partial<Application>): Application {
  return {
    name: input.name || "Test App",
    path: input.path || `/Applications/${input.name || "Test App"}.app`,
    bundleId: input.bundleId,
  };
}

test("isRaycastApplication recognizes Raycast", () => {
  assert.equal(
    isRaycastApplication(
      app({
        name: "Raycast",
        bundleId: "com.raycast.macos",
        path: "/Applications/Raycast.app",
      }),
    ),
    true,
  );
});

test("canApplicationOpenWebUrls accepts apps declaring http or https schemes", async () => {
  const application = app({ name: "Any Browser" });

  assert.equal(
    await canApplicationOpenWebUrls(application, {
      readInfoPlistJson: async () =>
        JSON.stringify({
          CFBundleURLTypes: [
            { CFBundleURLSchemes: ["custom-scheme"] },
            { CFBundleURLSchemes: ["https"] },
          ],
        }),
    }),
    true,
  );
});

test("canApplicationOpenWebUrls rejects apps without web URL schemes", async () => {
  const application = app({ name: "Terminal" });

  assert.equal(
    await canApplicationOpenWebUrls(application, {
      readInfoPlistJson: async () =>
        JSON.stringify({
          CFBundleURLTypes: [{ CFBundleURLSchemes: ["ssh", "telnet"] }],
        }),
    }),
    false,
  );
});

test("canApplicationOpenWebUrls returns false for missing or invalid plists", async () => {
  assert.equal(
    await canApplicationOpenWebUrls(app({ name: "Broken App" }), {
      readInfoPlistJson: async () => {
        throw new Error("missing plist");
      },
    }),
    false,
  );

  assert.equal(
    await canApplicationOpenWebUrls(app({ name: "Invalid App" }), {
      readInfoPlistJson: async () => "not json",
    }),
    false,
  );
});

test("canApplicationOpenWebUrls returns false for non-macOS platforms and non-app paths", async () => {
  assert.equal(
    await canApplicationOpenWebUrls(app({ name: "Browser" }), {
      platform: "win32",
      readInfoPlistJson: async () =>
        JSON.stringify({
          CFBundleURLTypes: [{ CFBundleURLSchemes: ["https"] }],
        }),
    }),
    false,
  );

  assert.equal(
    await canApplicationOpenWebUrls(
      app({ name: "Browser Binary", path: "/usr/local/bin/browser" }),
      {
        readInfoPlistJson: async () =>
          JSON.stringify({
            CFBundleURLTypes: [{ CFBundleURLSchemes: ["https"] }],
          }),
      },
    ),
    false,
  );
});

test("filterWebUrlApplications includes only web-capable apps", async () => {
  const browser = app({ name: "Browser" });
  const terminal = app({ name: "Terminal" });
  const broken = app({ name: "Broken App" });

  assert.deepEqual(
    await filterWebUrlApplications(
      [browser, terminal, broken],
      async (application) => application.name === "Browser",
    ),
    [browser],
  );
});

test("getActiveBrowserAfterRaycastCloses returns web-capable app after Raycast loses focus", async () => {
  const browser = app({
    name: "Any Browser",
    bundleId: "example.browser",
    path: "/Applications/Any Browser.app",
  });
  const applications = [
    app({
      name: "Raycast",
      bundleId: "com.raycast.macos",
      path: "/Applications/Raycast.app",
    }),
    browser,
  ];

  const activeBrowser = await getActiveBrowserAfterRaycastCloses({
    getFrontmostApplication: async () => applications.shift() || browser,
    sleep: async () => undefined,
    canOpenWebUrls: async () => true,
  });

  assert.equal(activeBrowser, browser);
});

test("getActiveBrowserAfterRaycastCloses returns null when Raycast stays frontmost until timeout", async () => {
  let now = 0;
  let calls = 0;
  const activeBrowser = await getActiveBrowserAfterRaycastCloses({
    getFrontmostApplication: async () => {
      calls++;
      return app({
        name: "Raycast",
        bundleId: "com.raycast.macos",
        path: "/Applications/Raycast.app",
      });
    },
    sleep: async (ms) => {
      now += ms;
    },
    canOpenWebUrls: async () => true,
    now: () => now,
    timeoutMs: 100,
    intervalMs: 50,
  });

  assert.equal(activeBrowser, null);
  assert.equal(calls, 3);
});

test("getActiveBrowserAfterRaycastCloses returns null when restored app is not a browser", async () => {
  const terminal = app({
    name: "Terminal",
    bundleId: "com.apple.Terminal",
    path: "/Applications/Utilities/Terminal.app",
  });
  const applications = [
    app({
      name: "Raycast",
      bundleId: "com.raycast.macos",
      path: "/Applications/Raycast.app",
    }),
    terminal,
  ];

  const activeBrowser = await getActiveBrowserAfterRaycastCloses({
    getFrontmostApplication: async () => applications.shift() || terminal,
    sleep: async () => undefined,
    canOpenWebUrls: async () => false,
  });

  assert.equal(
    getUrlOpenApplication({
      activeBrowser,
      configuredBrowser: "/Applications/Firefox.app",
    }),
    "/Applications/Firefox.app",
  );
});

test("getUrlOpenApplication prefers active browser over configured browser", () => {
  const browser = app({
    name: "Any Browser",
    bundleId: "example.browser",
    path: "/Applications/Any Browser.app",
  });

  assert.equal(
    getUrlOpenApplication({
      activeBrowser: browser,
      configuredBrowser: "/Applications/Firefox.app",
    }),
    browser,
  );
});

test("getUrlOpenApplication falls back to configured browser when there is no active browser", () => {
  assert.equal(
    getUrlOpenApplication({
      activeBrowser: null,
      configuredBrowser: "/Applications/Firefox.app",
    }),
    "/Applications/Firefox.app",
  );
});

test("shouldResolveActiveBrowser skips Raycast deeplinks", () => {
  assert.equal(shouldResolveActiveBrowser("raycast://extensions", true), false);
  assert.equal(shouldResolveActiveBrowser("https://example.com", true), true);
  assert.equal(shouldResolveActiveBrowser("https://example.com", false), false);
});
