import type { BrowserWindow } from "../src/browsers/types";
import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import createLoader from "./load-ts.ts";
import { readAsset, swiftFunction, runSwiftHarness } from "./swift-harness.ts";

test("AX fallback rejects the surviving duplicate after the selected window closes", async () => {
  let snapshot = "1\u001fAXStandardWindow\u001fSame\u001e2\u001fAXStandardWindow\u001fSame\u001e";
  let raises = 0;
  const windows = createLoader({
    "./helpers/applescript": {
      runAppleScript: async (script: string) => {
        if (script.includes('perform action "AXRaise"')) {
          raises++;
          return "";
        }
        return snapshot;
      },
    },
  })("src/windows.ts");
  const [selected] = await windows.queryAXWindows(10);
  snapshot = "1\u001fAXStandardWindow\u001fSame\u001e";
  await assert.rejects(windows.raiseAXWindow(selected), /ambiguous/);
  assert.equal(raises, 0);
  const [unique] = await windows.queryAXWindows(10);
  await windows.raiseAXWindow(unique);
  assert.equal(raises, 1);
});

test("WebKit URL evidence follows unique titles across reorders and rejects duplicates", () => {
  runSwiftHarness(`${swiftFunction(readAsset("webkit-ax.swift"), "matchedTabURL")}
    precondition(matchedTabURL(title: "A", axTitles: ["A", "B"], aeTitles: ["B", "A"], aeURLs: ["url-b", "url-a"]) == "url-a")
    precondition(matchedTabURL(title: "B", axTitles: ["A", "B"], aeTitles: ["B", "A"], aeURLs: ["url-b", "url-a"]) == "url-b")
    precondition(matchedTabURL(title: "A", axTitles: ["A", "A"], aeTitles: ["A", "B"], aeURLs: ["url-a", "url-b"]) == "")
    precondition(matchedTabURL(title: "A", axTitles: ["A", "B"], aeTitles: ["A", "A"], aeURLs: ["url-a", "url-b"]) == "")
    precondition(matchedTabURL(title: "Missing", axTitles: ["Missing"], aeTitles: ["A"], aeURLs: ["url-a"]) == "")
  `);
});

test("Firefox keeps unconnected profiles and reconciles uniquely covered windows", async () => {
  const session = "abcdef1234567890";
  const tab = (id: string, title: string) => ({ id, title, url: "" });
  let axWindows = [
    { id: "10", title: "A", tabs: [tab("10:0", "A")] },
    { id: "20", title: "B", tabs: [tab("20:0", "B")] },
  ];
  const firefox = createLoader({
    "node:fs/promises": { readdir: async () => [session + ".sock"] },
    "node:net": {
      createConnection: () => {
        const socket = new EventEmitter() as EventEmitter & {
          setTimeout: () => void;
          destroy: () => void;
          write: () => void;
        };
        socket.setTimeout = () => {};
        socket.destroy = () => {};
        socket.write = () =>
          queueMicrotask(() =>
            socket.emit(
              "data",
              Buffer.from(
                JSON.stringify({
                  data: [{ id: 1, title: "A", tabs: [{ id: 2, title: "A", url: "https://a.example" }] }],
                }) + "\n",
              ),
            ),
          );
        queueMicrotask(() => socket.emit("connect"));
        return socket;
      },
    },
    "../helpers/browser-helper": { runBrowserHelper: async () => JSON.stringify(axWindows) },
  })("src/browsers/firefox.ts");
  const native = [10, 20].map((id) => ({
    id,
    pid: id,
    app: "Firefox",
    subrole: "AXStandardWindow",
    frame: { x: 0, y: 0, w: 800, h: 600 },
  }));
  const result: BrowserWindow[] = await firefox.getFirefoxWindows(undefined, native);
  assert.deepEqual(
    Array.from(result, (window) => window.id),
    [session + ":1", "20"],
  );
  assert.equal(result[0].tabs[0].url, "https://a.example");
  assert.deepEqual(await firefox.getFirefoxSummary(undefined, native), { windows: 2, tabs: undefined });
  axWindows = axWindows.map((window) => ({ ...window, tabs: [tab(window.id + ":0", "A")] }));
  assert.equal((await firefox.getFirefoxWindows(undefined, native)).length, 3, "ambiguous AX coverage stays visible");
});
