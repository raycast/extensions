import type { BrowserWindow } from "../src/browsers/types";
import assert from "node:assert/strict";
import test from "node:test";
import { assetPath, readAsset, readFixture, swiftFunction, runSwiftHarness } from "./swift-harness.ts";
import createLoader from "./load-ts.ts";

test("partial tab URLs remain searchable for every browser engine", async () => {
  const windows = [
    {
      id: "1",
      tabs: [
        { id: "1:0", title: "Known", url: "https://example.com" },
        { id: "1:1", title: "Unknown", url: "" },
      ],
    },
  ];
  const load = createLoader({
    "../windows": { queryWindows: async () => [] },
    "./native": { getNativeBrowserWindows: async () => windows },
    "./firefox": { getFirefoxWindows: async () => windows },
  });
  for (const engine of ["chromium", "webkit", "firefox"]) {
    const result = await load("src/browsers/client.ts").getBrowserWindows({ engine });
    assert.equal(result[0].tabs[0].url, "https://example.com");
    assert.equal(result[0].tabs[1].url, "");
  }
});

test("legacy title resolution rejects duplicates and WebKit fallback propagates failures", () => {
  const fallback = swiftFunction(readAsset("webkit-ax.swift"), "focusTabViaAppleEvent");
  const scenarios = readFixture("webkit-tab-fallback.swift");
  runSwiftHarness(`${fallback}\n${scenarios}`, [assetPath("browser-tab-references.swift")]);
});

test("WebKit keeps normal and minimized dialog windows in the same snapshot", async () => {
  const native = [
    { id: 10, pid: 20, app: "Safari", title: "Start Page", subrole: "AXStandardWindow", space: 2, isMinimized: false },
    { id: 11, pid: 20, app: "Safari", title: "Work", subrole: "AXDialog", space: 0, isMinimized: true },
  ].map((window) => ({ ...window, frame: { x: 0, y: 0, w: 800, h: 600 } }));
  const { getBrowserWindows } = createLoader({
    "../helpers/browser-helper": {
      runBrowserHelper: async (_name, _directory, args) =>
        JSON.stringify(
          (JSON.parse(args[2]) as { id: number; title: string }[]).map((window) => ({
            id: String(window.id),
            title: window.title,
            tabs: [{ id: `${window.id}:0`, title: window.title, url: "https://example.com" }],
          })),
        ),
    },
  })("src/browsers/client.ts");
  const windows: BrowserWindow[] = await getBrowserWindows({ appName: "Safari", engine: "webkit" }, native);
  assert.deepEqual(
    windows.map((window) => window.id),
    ["11", "10"],
  );
  assert.equal(windows.find((window) => window.id === "10")!.isMinimized, false);
  assert.equal(windows.find((window) => window.id === "11")!.isMinimized, true);
});
