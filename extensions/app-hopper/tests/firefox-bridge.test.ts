import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import vm from "node:vm";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import createLoader from "./load-ts.ts";
import ts from "typescript";

const companionSource = ts.transpileModule(fs.readFileSync("companion/background.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
}).outputText;

function event() {
  const listeners: ((data: unknown) => unknown)[] = [];
  return {
    addListener: (fn: (data: unknown) => unknown) => listeners.push(fn),
    emit: (data?: unknown) => Promise.all(listeners.map((fn) => fn(data))),
  };
}

type TestPort = {
  onMessage: ReturnType<typeof event>;
  onDisconnect: ReturnType<typeof event>;
  disconnected?: boolean;
  postMessage(): void;
  disconnect(): void;
};

async function waitForSocket(child: ReturnType<typeof spawn>, directory: string) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Native bridge exited: ${child.exitCode}`);
    const file = fs.readdirSync(directory).find((file) => file.endsWith(".sock"));
    if (file) return path.join(directory, file);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Native bridge did not start");
}

for (const id of ["firefox", "zen"]) {
  const browser = { id, appName: id === "zen" ? "Zen" : "Firefox", engine: "firefox" };
  test(`real native host and ${id} companion return live background URLs, focus exact tabs, and clean up`, async (t) => {
    const directory = fs.mkdtempSync("/tmp/ah-bridge-");
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const binary = path.join(directory, "bridge");
    execFileSync(
      "/usr/bin/swiftc",
      ["-module-cache-path", path.join(directory, "cache"), "-O", "assets/firefox-bridge.swift", "-o", binary],
      { timeout: 60000 },
    );
    const child = spawn(binary, ["--directory", directory]);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    t.after(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    });
    const nativeMessage = event();
    let buffer = Buffer.alloc(0);
    child.stdout.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 4 && buffer.length >= 4 + buffer.readUInt32LE()) {
        const size = buffer.readUInt32LE();
        const message = JSON.parse(buffer.subarray(4, size + 4).toString("utf8"));
        buffer = buffer.subarray(size + 4);
        nativeMessage.emit(message).catch((error) => {
          t.diagnostic(error.message);
          child.kill("SIGTERM");
        });
      }
    });
    const postMessage = (value: unknown) => {
      const data = Buffer.from(JSON.stringify(value));
      const header = Buffer.alloc(4);
      header.writeUInt32LE(data.length);
      // Native framing must tolerate reads splitting both the length and the body.
      child.stdin.write(header.subarray(0, 1));
      child.stdin.write(Buffer.concat([header.subarray(1), data]));
    };
    const calls: [string, number, { active?: boolean; focused?: boolean }][] = [];
    const windows = [
      {
        id: 10,
        tabs: [
          { id: 20, windowId: 10, title: "Foreground", url: "https://example.com/foreground", active: true },
          { id: 21, windowId: 10, title: "Background", url: "https://example.com/background", active: false },
        ],
      },
    ];
    const clicked = event();
    let connections = 0;
    vm.runInNewContext(companionSource, {
      browser: {
        runtime: {
          id: "app-hopper-firefox@chenghsj",
          getBrowserInfo: async () => ({ name: "Firefox", ...(id === "zen" ? { zen: { version: "1.24" } } : {}) }),
          getManifest: () => ({ version: "1.0.0" }),
          connectNative: (host: string) => {
            assert.equal(host, `app_hopper.${id}`);
            connections++;
            return { onMessage: nativeMessage, onDisconnect: event(), postMessage, disconnect() {} };
          },
        },
        browserAction: { setBadgeText() {}, onClicked: clicked },
        windows: {
          getAll: async () => windows,
          update: async (id: number, options: { active?: boolean; focused?: boolean }) =>
            calls.push(["window", id, { ...options }]),
        },
        tabs: {
          get: async (id: number) => {
            const tab = windows.flatMap((window) => window.tabs).find((tab) => tab.id === id);
            if (!tab) throw new Error("Tab closed");
            return tab;
          },
          update: async (id: number, options: { active?: boolean; focused?: boolean }) =>
            calls.push(["tab", id, { ...options }]),
        },
      },
      setTimeout,
      clearTimeout,
    });
    const socketPath = await waitForSocket(child, directory);
    assert.equal(fs.statSync(directory).mode & 0o777, 0o700);
    assert.equal(fs.statSync(socketPath).mode & 0o777, 0o600);
    const load = createLoader({
      "./firefox-integration": {
        FIREFOX_DIRECTORY: id === "firefox" ? directory : directory + "/unused",
        ZEN_DIRECTORY: id === "zen" ? directory : directory + "/unused",
      },
      "../windows": { queryWindows: async () => [] },
    });
    const firefox = load("src/browsers/firefox.ts");
    assert.equal(await firefox.isFirefoxBridgeConnected(id), true);
    assert.deepEqual(await firefox.getFirefoxCompanionVersions(id), ["1.0.0"]);
    const [window] = await firefox.getFirefoxWindows(browser);
    assert.equal(window.tabs[1].url, "https://example.com/background");
    windows[0].tabs[1].url = "https://example.com/changed-without-selecting";
    assert.equal((await firefox.getFirefoxWindows(browser))[0].tabs[1].url, windows[0].tabs[1].url);
    await firefox.focusFirefoxTab(window.id, window.tabs[1].id, browser);
    assert.deepEqual(calls, [
      ["tab", 21, { active: true }],
      ["window", 10, { focused: true }],
    ]);
    calls.length = 0;
    windows[0].tabs[1].windowId = 11;
    await assert.rejects(firefox.focusFirefoxTab(window.id, window.tabs[1].id, browser), /tab moved/);
    assert.equal(calls.length, 0);
    windows[0].tabs.pop();
    await assert.rejects(firefox.focusFirefoxTab(window.id, window.tabs[1].id, browser), /Tab closed/);

    // Malformed requests must not reach the browser or execute commands.
    const client = net.createConnection(socketPath);
    client.setEncoding("utf8");
    await once(client, "connect");
    client.write('{"command":"run-shell"}\n');
    const [response] = await once(client, "data");
    assert.match(JSON.parse(response).error, /Unsupported/);
    client.destroy();
    windows.length = 0;
    assert.deepEqual(await firefox.getFirefoxWindows(browser), []);
    const closed = once(child, "close");
    await firefox.disconnectFirefoxBridges(id);
    assert.deepEqual(await closed, [0, null]);
    assert.equal(fs.existsSync(socketPath), false);
    assert.equal(stderr, "");
    assert.equal(connections, 1);

    const eof = spawn(binary, ["--directory", directory]);
    t.after(() => {
      if (eof.exitCode === null) eof.kill("SIGKILL");
    });
    eof.stderr.resume();
    const eofSocket = await waitForSocket(eof, directory);
    const eofClosed = once(eof, "close");
    eof.stdin.end();
    assert.equal((await eofClosed)[0], 0);
    assert.equal(fs.existsSync(eofSocket), false);

    // Reject native frames before allocating an oversized message.
    const malformed = spawn(binary, ["--directory", directory]);
    t.after(() => {
      if (malformed.exitCode === null) malformed.kill("SIGKILL");
    });
    malformed.stderr.resume();
    const malformedSocket = await waitForSocket(malformed, directory);
    const invalidFrame = Buffer.alloc(4);
    invalidFrame.writeUInt32LE(1024 * 1024 + 1);
    const exited = once(malformed, "close");
    malformed.stdin.end(invalidFrame);
    assert.equal((await exited)[0], 1);
    assert.equal(fs.existsSync(malformedSocket), false);
  });
}

test("Firefox companion reconnects after helper installation and toolbar clicks replace an existing connection", async () => {
  const ports: TestPort[] = [];
  const timers: { callback: () => void; delay: number }[] = [];
  const clicked = event();
  let nextTimer = 0;
  vm.runInNewContext(companionSource, {
    browser: {
      runtime: {
        getBrowserInfo: async () => ({ name: "Firefox" }),
        connectNative: () => {
          const port: TestPort = {
            onMessage: event(),
            onDisconnect: event(),
            postMessage() {},
            disconnect() {
              this.disconnected = true;
            },
          };
          ports.push(port);
          return port;
        },
      },
      browserAction: { setBadgeText() {}, onClicked: clicked },
    },
    setTimeout: (callback: () => void, delay: number) => {
      timers.push({ callback, delay });
      return ++nextTimer;
    },
    clearTimeout() {},
  });
  await new Promise((resolve) => setImmediate(resolve));
  await ports[0].onDisconnect.emit();
  assert.equal(timers[0].delay, 1000);
  timers[0].callback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ports.length, 2);
  await ports[1].onDisconnect.emit();
  assert.equal(timers[1].delay, 2000);
  timers[1].callback();
  await new Promise((resolve) => setImmediate(resolve));
  await clicked.emit();
  assert.equal(ports.length, 4);
  assert.equal(ports[2].disconnected, true);
  await ports[2].onDisconnect.emit();
  assert.equal(timers.length, 2, "stale disconnect must not schedule another connection");
});
