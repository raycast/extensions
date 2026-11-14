import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { once } from "node:events";
import createLoader from "./load-ts.ts";
import { readAsset, swiftFunction, runSwiftHarness } from "./swift-harness.ts";

test("native hosts choose independent directories for Firefox and Zen", () => {
  runSwiftHarness(`import Foundation
    ${swiftFunction(readAsset("firefox-bridge.swift"), "defaultBridgeDirectory").split("\nlet directory:")[0]}
    let home = URL(fileURLWithPath: "/test")
    precondition(defaultBridgeDirectory(executable: "/bin/zen-bridge-123", home: home) == "/test/Library/Application Support/raycast-app-hopper-zen")
    precondition(defaultBridgeDirectory(executable: "/bin/firefox-bridge-123", home: home) == "/test/Library/Application Support/raycast-yabai-firefox")
  `);
});

test("Zen companions expose hidden-sidebar URLs, retain unconnected profiles and focus only their browser session", async (t) => {
  const root = await fs.mkdtemp("/tmp/ah-gecko-");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dirs = { firefox: path.join(root, "firefox"), zen: path.join(root, "zen") };
  const commands: Record<string, unknown[]> = {};
  const sessionA = "abcdef1234567890",
    sessionB = "1111111111111111";
  for (const [browser, session, title] of [
    ["firefox", sessionA, "Firefox only"],
    ["zen", sessionA, "Work"],
    ["zen", sessionB, "Other"],
  ]) {
    const directory = dirs[browser as keyof typeof dirs];
    await fs.mkdir(directory, { recursive: true });
    const key = browser + session;
    commands[key] = [];
    const server = net.createServer((socket) => {
      let text = "";
      socket.on("data", (chunk) => {
        text += chunk;
        if (!text.endsWith("\n")) return;
        const command = JSON.parse(text);
        commands[key].push(command);
        socket.end(
          JSON.stringify({
            data:
              command.command === "list"
                ? [
                    {
                      id: 1,
                      title,
                      tabs: [
                        { id: 2, title, url: `https://${browser}.example/${session}` },
                        { id: 3, title: "Background", url: `https://${browser}.example/background` },
                      ],
                    },
                  ]
                : true,
          }) + "\n",
        );
      });
    });
    t.after(() => server.close());
    server.listen(path.join(directory, session + ".sock"));
    await once(server, "listening");
  }
  const native = ["Work", "Unconnected"].map((title, index) => ({
    id: 10 + index,
    pid: 50 + index,
    title,
    app: "Zen",
    frame: { x: 0, y: 0, w: 800, h: 600 },
  }));
  const firefox = createLoader({
    "./firefox-integration": { FIREFOX_DIRECTORY: dirs.firefox, ZEN_DIRECTORY: dirs.zen },
    "../helpers/browser-helper": {
      runBrowserHelper: async () =>
        JSON.stringify(
          native.map((window) => ({ id: String(window.id), title: window.title, tabs: [], tabListUnavailable: true })),
        ),
    },
  })("src/browsers/firefox.ts");
  const zen = { id: "zen", appName: "Zen", engine: "firefox" };
  const windows = await firefox.getFirefoxWindows(zen, native);
  assert.equal(windows.length, 3);
  const work = windows.find((window: { title: string }) => window.title === "Work");
  assert.equal(work.tabListUnavailable, false);
  assert.equal(work.tabs[1].url, "https://zen.example/background");
  assert(
    windows.some(
      (window: { title: string; tabListUnavailable?: boolean }) =>
        window.title === "Unconnected" && window.tabListUnavailable,
    ),
  );
  assert(!windows.some((window: { title: string }) => window.title === "Firefox only"));
  await firefox.focusFirefoxTab(work.id, work.tabs[1].id, zen);
  assert.deepEqual(commands["zen" + sessionA].at(-1), { command: "focus", windowId: 1, tabId: 3 });
  assert.equal(commands["firefox" + sessionA].length, 0);
  await assert.rejects(firefox.focusFirefoxTab(work.id, sessionB + ":3", zen), /session changed/);
  const [firefoxWindow] = await firefox.getFirefoxWindows(undefined, []);
  assert.equal(firefoxWindow.tabs[1].url, "https://firefox.example/background");
});
