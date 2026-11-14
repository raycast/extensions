import * as nativeCatalog from "../src/native-helper-catalog";
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { once } from "node:events";
import createLoader from "./load-ts.ts";

test("Raycast scopes Firefox IDs to a live session and rejects cross-profile focus", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ah-ff-"));
  const session = "abcdef1234567890";
  const socketPath = path.join(directory, session + ".sock");
  const commands: { tabId?: number }[] = [];
  const server = net.createServer((socket) => {
    let data = "";
    socket.on("data", (chunk) => {
      data += chunk;
      if (!data.endsWith("\n")) return;
      const command = JSON.parse(data);
      commands.push(command);
      socket.end(
        JSON.stringify({
          data:
            command.command === "list"
              ? [{ id: 2, title: "Test", tabs: [{ id: 3, title: "A", url: "https://example.com" }] }]
              : true,
        }) + "\n",
      );
    });
  });
  server.listen(socketPath);
  await once(server, "listening");
  t.after(() => {
    server.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const load = createLoader({
    "../windows": { queryWindows: async () => [] },
    "node:os": { homedir: () => directory },
    "node:path": { ...path, join: (...parts) => (parts.at(-1).endsWith(".sock") ? socketPath : directory) },
  });
  const firefox = load("src/browsers/firefox.ts");
  const [window] = await firefox.getFirefoxWindows();
  assert.equal(window.id, session + ":2");
  await firefox.focusFirefoxTab(window.id, window.tabs[0].id);
  assert.equal(commands[1].tabId, 3);
  await assert.rejects(firefox.focusFirefoxTab(window.id, "1111111111111111:3"), /session changed/);
  assert.equal(commands.length, 2);
});

test("extensionless Firefox adapter matches Chromium single-window and multi-window behavior without yabai", async () => {
  const calls: [string, string[]][] = [];
  let axWindowsOutput = [
    {
      id: "55854",
      title: "Download Firefox",
      space: 3,
      tabs: [
        { id: "55854:0", title: "Netflix", url: "" },
        { id: "55854:1", title: "Download Firefox", url: "www.firefox.com" },
      ],
    },
  ];
  const load = createLoader({
    "../native-helper-catalog": { ...nativeCatalog, nativeHelperSourceHash: () => "v1" },
    "../helpers/browser-helper": {
      runBrowserHelper: (...args) => load("src/helpers/native-helper.ts").runNativeHelper(...args),
    },
    "@raycast/api": {
      environment: { supportPath: "/mock/support", assetsPath: "/mock/assets" },
    },
    "node:fs": { existsSync: (file) => !file.endsWith("/native/manifest.json") },
    "node:fs/promises": {
      readdir: async () => [],
      mkdir: async () => {},
      rename: async () => {},
    },
    "node:child_process": {
      execFile: (bin, args, _options, callback) => {
        calls.push([bin, args]);
        if (bin.endsWith("macos-windows-v1") && args[0] === "list") {
          callback(
            null,
            JSON.stringify([
              {
                id: 55854,
                pid: 91868,
                app: "Firefox",
                title: "Download Firefox",
                space: 3,
                subrole: "AXStandardWindow",
                frame: { x: 0, y: 0, w: 800, h: 600 },
                "has-ax-reference": true,
              },
            ]),
            "",
          );
          return;
        }
        if (bin.endsWith("firefox-ax-v1") && args[0] === "list") {
          callback(null, JSON.stringify(axWindowsOutput), "");
          return;
        }
        if (bin.endsWith("firefox-ax-v1") && args[0] === "focus") {
          callback(null, "ok", "");
          return;
        }
        callback(null, "", "");
      },
    },
  });

  const client = load("src/browsers/client.ts");
  const firefoxConfig = {
    id: "firefox",
    appName: "Firefox",
    appPath: "/Applications/Firefox.app",
    engine: "firefox",
  };

  // Single window: summary reports both window count (1) and tab count (2)
  const singleSummary = await client.getBrowserSummary(firefoxConfig);
  assert.deepEqual(singleSummary, { windows: 1, tabs: 2 });

  const singleWindows = await client.getBrowserWindows(firefoxConfig);
  assert.equal(singleWindows.length, 1);
  assert.equal(singleWindows[0].space, 3);
  assert.equal(singleWindows[0].tabs.length, 2);

  // Multiple windows: summary reports window count (2) and omits top-level tab count
  axWindowsOutput = [
    ...axWindowsOutput,
    {
      id: "55858",
      title: "New Tab",
      space: 3,
      tabs: [{ id: "55858:0", title: "New Tab", url: "" }],
    },
  ];
  const multiSummary = await client.getBrowserSummary(firefoxConfig);
  assert.deepEqual(multiSummary, { windows: 2, tabs: undefined });

  // Focusing a tab invokes the Firefox AX helper directly without calling yabai
  calls.length = 0;
  await client.focusBrowserTab(firefoxConfig, singleWindows[0], singleWindows[0].tabs[0]);
  assert(
    calls.some(
      ([bin, args]) =>
        bin.endsWith("firefox-ax-v1") &&
        args[0] === "focus" &&
        args[1] === "Firefox" &&
        args[2] === "55854" &&
        args[3] === "55854:0" &&
        args[4] === "Netflix" &&
        args[5] === "91868",
    ),
  );
});
