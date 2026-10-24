import { test } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import {
  listServers,
  findServer,
  openSkillsTarget,
  openTarget,
  resolveBinary,
  spawnShowmd,
  spawnShowmdSkills,
  isCommandNotFound,
  readRecents,
  removeRecent,
  platformDataDir,
  tildify,
  getManageStatus,
  waitForServer,
  targetUrlAfterSpawn,
  restartServer,
  diffSettings,
  pickSelectionTarget,
  describeStatus,
  describeMenuBar,
  labelForServer,
  fetchWithTimeout,
  pickFreePort,
  detectInstalledBrowsers,
  browserOptions,
} from "../src/lib/showmd.ts";

function fakeDeps(overrides = {}) {
  return {
    platform: "darwin",
    homedir: () => "/Users/test",
    env: {},
    readFile: async () => {
      throw new Error("ENOENT");
    },
    readDir: async () => {
      throw new Error("ENOENT");
    },
    pickPort: async () => 55001,
    // Real spawn-grace timing (SPAWN_GRACE_MS) would make every spawn test
    // wait ~400ms for no reason; tests that actually exercise the grace
    // window override this with one they control.
    sleepImpl: async () => {},
    ...overrides,
  };
}

test("tildify: home prefix collapses, lookalikes and foreign paths do not", () => {
  const deps = fakeDeps();
  assert.equal(tildify("/Users/test/Documents/notes", deps), "~/Documents/notes");
  assert.equal(tildify("/Users/test", deps), "~");
  assert.equal(tildify("/Users/testing/notes", deps), "/Users/testing/notes");
  assert.equal(tildify("/opt/docs", deps), "/opt/docs");
});

test("tildify: win32 collapses home case-insensitively with backslashes", () => {
  const deps = fakeDeps({
    platform: "win32",
    homedir: () => "C:\\Users\\test",
  });
  assert.equal(tildify("C:\\Users\\test\\Documents", deps), "~\\Documents");
  assert.equal(tildify("c:\\users\\TEST\\Documents", deps), "~\\Documents");
  assert.equal(tildify("C:\\Users\\test", deps), "~");
  assert.equal(tildify("C:\\Users\\testing\\docs", deps), "C:\\Users\\testing\\docs");
  assert.equal(tildify("D:\\docs", deps), "D:\\docs");
});

test("platformDataDir: darwin uses Application Support", () => {
  const dir = platformDataDir(fakeDeps());
  assert.equal(dir, "/Users/test/Library/Application Support/showmd");
});

test("platformDataDir: win32 uses LOCALAPPDATA", () => {
  // path.join always uses the host's separator (posix here), matching
  // server/settings.js's platformDataDir, which has the same host-path
  // behavior when unit-tested off Windows.
  const dir = platformDataDir(
    fakeDeps({
      platform: "win32",
      env: { LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local" },
    }),
  );
  assert.equal(dir, "C:\\Users\\test\\AppData\\Local/showmd");
});

// Registry deps: readDir lists ports/<pid>.json names, readFile returns each
// file's {port,pid} body. settingsCalls tracks whether settings.json was
// ever asked for, so discovery tests can assert it never is.
function registryDeps(
  { registry = {}, prefFetch, settingsCalls } = {},
  overrides = {},
) {
  const names = Object.keys(registry);
  return fakeDeps({
    readDir: async (dir) => {
      if (dir.endsWith("ports")) return names;
      throw new Error("ENOENT");
    },
    readFile: async (p) => {
      if (p.endsWith("settings.json")) {
        if (settingsCalls) settingsCalls.push(p);
        throw new Error("ENOENT");
      }
      for (const name of names) {
        if (p.endsWith(name)) return JSON.stringify(registry[name]);
      }
      throw new Error("ENOENT");
    },
    fetchImpl: prefFetch,
    ...overrides,
  });
}

function versionResponse(mode, extra = {}) {
  return {
    ok: true,
    json: async () => ({ version: "1.0.0", protocol: 1, mode, ...extra }),
  };
}

function rootsResponse(roots) {
  return { ok: true, json: async () => ({ roots }) };
}

// Builds a prefFetch that answers /api/version and /api/roots for one port,
// the shape probe() always requests together.
function serverAt(port, mode, roots = [], extra = {}) {
  return async (url) => {
    if (url.startsWith(`http://127.0.0.1:${port}/api/version`))
      return versionResponse(mode, extra);
    if (url.startsWith(`http://127.0.0.1:${port}/api/roots`))
      return rootsResponse(roots);
    throw new Error(`unexpected ${url}`);
  };
}

// GET /api/registry's shape: server/protocol.js's orderRegistry output,
// already filtered and ordered. Tests hand back the exact array the real
// endpoint would, never re-deriving it from a mode/protocol filter here.
function registryResponse(entries) {
  return { ok: true, json: async () => entries };
}

function registryEntry(port, extra = {}) {
  return {
    version: "1.0.0",
    protocol: 1,
    mode: "shared",
    actualPort: port,
    instanceId: `instance-${port}`,
    startedAt: "2026-01-01T00:00:00.000Z",
    capabilities: [],
    ...extra,
  };
}

function combine(...fetchers) {
  return async (url, opts) => {
    for (const fetcher of fetchers) {
      try {
        return await fetcher(url, opts);
      } catch (err) {
        if (!/^unexpected /.test(err.message)) throw err;
      }
    }
    throw new Error(`unexpected ${url}`);
  };
}

test("listServers: enumerates every live registry entry, ignoring dead ones", async () => {
  const calls = [];
  const deps = registryDeps({
    registry: {
      "111.json": { port: 5001, pid: 111 },
      "222.json": { port: 5002, pid: 222 },
    },
    prefFetch: async (url, opts) => {
      calls.push(url);
      if (url.includes(":5001"))
        return serverAt(5001, "shared", [
          { key: "r1", dir: "/notes", name: "notes", url: "/r/r1/" },
        ])(url, opts);
      throw new Error("ECONNREFUSED");
    },
  });
  const servers = await listServers({}, deps);
  assert.deepEqual(servers, [
    {
      port: 5001,
      pid: 111,
      version: "1.0.0",
      protocol: 1,
      mode: "shared",
      roots: [{ key: "r1", dir: "/notes", name: "notes", url: "/r/r1/" }],
    },
  ]);
  assert.ok(
    calls.some((u) => u.includes(":5002")),
    "the dead entry was still probed",
  );
});

test("listServers: settings.json is never consulted during discovery", async () => {
  const settingsCalls = [];
  const deps = registryDeps({
    registry: { "111.json": { port: 5001, pid: 111 } },
    settingsCalls,
    prefFetch: serverAt(5001, "shared"),
  });
  await listServers({}, deps);
  assert.deepEqual(settingsCalls, []);
});

test("listServers: the port preference is a first-priority candidate alongside the registry", async () => {
  const deps = registryDeps({
    registry: { "111.json": { port: 5001, pid: 111 } },
    prefFetch: combine(serverAt(9999, "shared"), serverAt(5001, "shared")),
  });
  const servers = await listServers({ port: "9999" }, deps);
  const ports = servers.map((s) => s.port).sort();
  assert.deepEqual(ports, [5001, 9999]);
});

test("listServers: falls back to a single probe of 4321 when the registry yields nothing live", async () => {
  const deps = registryDeps({
    prefFetch: serverAt(4321, "shared"),
  });
  const servers = await listServers({}, deps);
  assert.deepEqual(servers, [
    {
      port: 4321,
      pid: undefined,
      version: "1.0.0",
      protocol: 1,
      mode: "shared",
      roots: [],
    },
  ]);
});

test("listServers: nothing live anywhere returns an empty list", async () => {
  const deps = registryDeps({
    prefFetch: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  const servers = await listServers({}, deps);
  assert.deepEqual(servers, []);
});

test("findServer: reports the first live server from listServers", async () => {
  const deps = registryDeps({
    registry: { "111.json": { port: 5001, pid: 111 } },
    prefFetch: serverAt(5001, "shared"),
  });
  const status = await findServer({}, deps);
  assert.equal(status.running, true);
  assert.equal(status.port, 5001);
  assert.equal(status.version, "1.0.0");
});

test("findServer: reports not running, port falls back to the preference, when nothing is live", async () => {
  const deps = registryDeps({
    prefFetch: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  const status = await findServer({ port: "4321" }, deps);
  assert.equal(status.running, false);
  assert.equal(status.port, 4321);
});

test("openTarget: reuses the server GET /api/registry names first, via add-root", async () => {
  const posted = [];
  const deps = registryDeps({
    registry: { "111.json": { port: 5001, pid: 111 } },
    prefFetch: async (url, opts) => {
      if (url.endsWith("/api/version")) return versionResponse("shared");
      if (url.endsWith("/api/registry"))
        return registryResponse([registryEntry(5001)]);
      if (opts?.method === "POST" && url.endsWith("/api/roots")) {
        posted.push(JSON.parse(opts.body));
        return {
          ok: true,
          json: async () => ({ url: "/r/abc/doc.md" }),
        };
      }
      if (url.endsWith("/api/roots")) return rootsResponse([]);
      throw new Error(`unexpected ${url}`);
    },
  });
  const plan = await openTarget("/y/doc.md", { reuseServer: true }, deps);
  assert.equal(plan.action, "url");
  assert.equal(plan.url, "http://127.0.0.1:5001/r/abc/doc.md");
  assert.deepEqual(posted, [{ path: "/y/doc.md" }]);
});

test("openTarget: no consumer-side filtering — an empty /api/registry (e.g. a dedicated-only process) still spawns", async () => {
  let spawned = false;
  const deps = registryDeps(
    {
      registry: { "111.json": { port: 5001, pid: 111 } },
      prefFetch: async (url) => {
        if (url.endsWith("/api/version")) return versionResponse("dedicated");
        if (url.endsWith("/api/roots")) return rootsResponse([]);
        if (url.endsWith("/api/registry")) return registryResponse([]);
        throw new Error(`unexpected ${url}`);
      },
    },
    {
      spawnImpl: () => {
        spawned = true;
        return fakeChild();
      },
    },
  );
  const plan = await openTarget(
    "/y/doc.md",
    { showmdPath: "/bin/showmd" },
    deps,
  );
  assert.equal(plan.action, "spawn");
  assert.equal(spawned, true);
});

test("openTarget: the configured port preference is forwarded to /api/registry so the server can break ties", async () => {
  const registryCalls = [];
  const deps = registryDeps({
    registry: { "111.json": { port: 5001, pid: 111 } },
    prefFetch: async (url, opts) => {
      if (url.endsWith("/api/version")) return versionResponse("shared");
      if (url.endsWith("/api/roots") && opts?.method === "POST")
        return { ok: true, json: async () => ({ url: "/r/abc/" }) };
      if (url.endsWith("/api/roots")) return rootsResponse([]);
      if (url.includes("/api/registry")) {
        registryCalls.push(url);
        return registryResponse([registryEntry(5001)]);
      }
      throw new Error(`unexpected ${url}`);
    },
  });
  await openTarget("/y/doc.md", { port: "5001", reuseServer: true }, deps);
  assert.deepEqual(registryCalls, [
    "http://127.0.0.1:5001/api/registry?configuredPort=5001",
  ]);
});

test("openTarget: reuseServer=false always spawns even when a shared server runs", async () => {
  let spawned = false;
  const deps = registryDeps(
    {
      registry: { "111.json": { port: 5001, pid: 111 } },
      prefFetch: async (url) => {
        if (url.endsWith("/api/version")) return versionResponse("shared");
        if (url.endsWith("/api/roots")) return rootsResponse([]);
        throw new Error(
          `unexpected ${url} (reuseServer:false must never probe further)`,
        );
      },
    },
    {
      spawnImpl: () => {
        spawned = true;
        return fakeChild();
      },
    },
  );
  const plan = await openTarget(
    "/y/doc.md",
    { showmdPath: "/bin/showmd", reuseServer: false },
    deps,
  );
  assert.equal(plan.action, "spawn");
  assert.equal(spawned, true);
});

test("openSkillsTarget: reuses a protocol-matching live instance when enabled", async () => {
  let spawned = false;
  const deps = registryDeps(
    {
      registry: { "111.json": { port: 5001, pid: 111 } },
      prefFetch: serverAt(5001, "shared"),
    },
    {
      spawnImpl: () => {
        spawned = true;
        return fakeChild();
      },
    },
  );

  const plan = await openSkillsTarget({ reuseServer: true }, deps);
  assert.deepEqual(plan, {
    action: "url",
    url: "http://127.0.0.1:5001/skills/",
  });
  assert.equal(spawned, false);
});

test("openSkillsTarget: reuseServer=false skips discovery and starts skills", async () => {
  const spawnCalls = [];
  const deps = registryDeps(
    {
      registry: { "111.json": { port: 5001, pid: 111 } },
      prefFetch: async (url) => {
        throw new Error(
          `unexpected ${url} (reuseServer:false must skip discovery)`,
        );
      },
    },
    {
      pickPort: async () => 61234,
      spawnImpl: (command, args, options) => {
        spawnCalls.push({ command, args, options });
        return fakeChild();
      },
    },
  );

  const plan = await openSkillsTarget(
    { showmdPath: "/bin/showmd", reuseServer: false },
    deps,
  );
  assert.equal(plan.action, "spawn");
  assert.equal(plan.result.ok, true);
  assert.deepEqual(spawnCalls[0].args, [
    "skills",
    "--port",
    "61234",
    "--no-open",
  ]);
});

test("openTarget: no server running starts a reusable Home before adding the target", async () => {
  const spawnCalls = [];
  const deps = registryDeps(
    {
      prefFetch: async () => {
        throw new Error("ECONNREFUSED");
      },
    },
    {
      pickPort: async () => 61234,
      spawnImpl: (command, args) => {
        spawnCalls.push({ command, args });
        return fakeChild();
      },
    },
  );
  const plan = await openTarget(
    "/y/doc.md",
    { showmdPath: "/bin/showmd" },
    deps,
  );
  assert.equal(plan.action, "spawn");
  assert.equal(plan.result.port, 61234);
  assert.deepEqual(spawnCalls[0].args, [
    "--launcher",
    "--port",
    "61234",
    "--no-open",
  ]);
});

test("targetUrlAfterSpawn: opens the requested document instead of ShowMD Home", async () => {
  const posted = [];
  const deps = fakeDeps({
    readDir: async () => [],
    fetchImpl: async (url, opts) => {
      if (url.endsWith("/api/version")) return versionResponse("shared");
      if (opts?.method === "POST" && url.endsWith("/api/roots")) {
        posted.push(JSON.parse(opts.body));
        return {
          ok: true,
          json: async () => ({ url: "/r/abc/example.md" }),
        };
      }
      if (url.endsWith("/api/roots")) return rootsResponse([]);
      throw new Error(`unexpected ${url}`);
    },
  });

  const result = await targetUrlAfterSpawn(
    "/notes/example.md",
    {},
    { ok: true, port: 51999 },
    deps,
  );

  assert.deepEqual(result, {
    running: true,
    url: "http://127.0.0.1:51999/r/abc/example.md",
  });
  assert.deepEqual(posted, [{ path: "/notes/example.md" }]);
});

test("targetUrlAfterSpawn: waits for the spawned port, not an older server", async () => {
  const posted = [];
  let newPortLive = false;
  const deps = fakeDeps({
    readDir: async () => [],
    sleepImpl: async () => {
      newPortLive = true;
    },
    fetchImpl: async (url, opts) => {
      const forNewPort = url.includes(":51999/");
      if (forNewPort && !newPortLive) throw new Error("ECONNREFUSED");
      if (url.endsWith("/api/version")) return versionResponse("shared");
      if (opts?.method === "POST" && url.endsWith("/api/roots")) {
        posted.push({ port: forNewPort ? 51999 : 4321 });
        return { ok: true, json: async () => ({ url: "/r/abc/example.md" }) };
      }
      if (url.endsWith("/api/roots")) return rootsResponse([]);
      throw new Error(`unexpected ${url}`);
    },
  });

  const result = await targetUrlAfterSpawn(
    "/notes/example.md",
    {},
    { ok: true, port: 51999 },
    deps,
  );

  assert.deepEqual(result, {
    running: true,
    url: "http://127.0.0.1:51999/r/abc/example.md",
  });
  assert.deepEqual(posted, [{ port: 51999 }]);
});

test("restartServer: reports the port it restarted, so the caller can wait for that one", async () => {
  const deps = fakeDeps({
    readDir: async () => [],
    fetchImpl: async (url, opts) => {
      if (url.startsWith("http://127.0.0.1:4321/api/version"))
        return versionResponse("shared");
      if (url.startsWith("http://127.0.0.1:4321/api/roots"))
        return rootsResponse([]);
      if (opts?.method === "POST" && url.endsWith("/api/restart"))
        return { ok: true, json: async () => ({}) };
      throw new Error(`unexpected ${url}`);
    },
  });

  const result = await restartServer({}, deps);

  assert.deepEqual(result, { ok: true, port: 4321 });
});

test("resolveBinary: preference path comes first, npx is the last rung", () => {
  const ladder = resolveBinary({ showmdPath: "/custom/showmd" }, fakeDeps());
  assert.equal(ladder[0].command, "/custom/showmd");
  assert.equal(ladder[ladder.length - 1].command, "npx");
  assert.deepEqual(ladder[ladder.length - 1].args, ["-y", "showmd-cli"]);
});

test("resolveBinary: win32 uses .cmd shims", () => {
  const ladder = resolveBinary(
    {},
    fakeDeps({ platform: "win32", env: { NVM_DIR: "C:\\nvm" } }),
  );
  assert.ok(ladder.some((c) => c.command.endsWith("showmd.cmd")));
});

test("resolveBinary: no rung ever sets shell:true, on any platform", () => {
  for (const platform of ["darwin", "linux", "win32"]) {
    const ladder = resolveBinary(
      { showmdPath: "/custom/showmd" },
      fakeDeps({ platform, env: { NVM_DIR: "C:\\nvm" } }),
    );
    assert.ok(ladder.every((c) => !("useShell" in c)));
  }
});

test("spawnShowmd: never passes shell:true to spawnImpl, and args stay an array even for a hostile path", async () => {
  const spawnCalls = [];
  const deps = fakeDeps({
    platform: "win32",
    env: { NVM_DIR: "C:\\nvm" },
    spawnImpl: (command, args, options) => {
      spawnCalls.push({ command, args, options });
      return fakeChild();
    },
  });
  const evilPath = "evil & calc.md";
  const result = await spawnShowmd(
    evilPath,
    { showmdPath: "/custom/showmd" },
    deps,
  );
  assert.equal(result.ok, true);
  assert.ok(spawnCalls.length >= 1);
  for (const call of spawnCalls) {
    assert.equal(call.options.shell, undefined);
    assert.ok(Array.isArray(call.args));
  }
  assert.ok(spawnCalls[0].args.includes(evilPath));
});

test("spawnShowmd: asks for a free port and passes it explicitly, so the caller never has to rediscover it", async () => {
  const spawnCalls = [];
  const deps = fakeDeps({
    pickPort: async () => 61234,
    spawnImpl: (command, args, options) => {
      spawnCalls.push({ command, args, options });
      return fakeChild();
    },
  });
  const result = await spawnShowmd("/doc.md", {}, deps);
  assert.equal(result.ok, true);
  assert.equal(result.port, 61234);
  assert.ok(spawnCalls.length >= 1);
  const args = spawnCalls[0].args;
  const portFlagIndex = args.indexOf("--port");
  assert.ok(portFlagIndex >= 0, "expected --port in the spawned args");
  assert.equal(args[portFlagIndex + 1], "61234");
});

test("spawnShowmd: reports the port-picker error instead of hiding the launch failure", async () => {
  const spawnCalls = [];
  const deps = fakeDeps({
    pickPort: async () => {
      throw new Error("EMFILE: too many open files");
    },
    spawnImpl: (command, args, options) => {
      spawnCalls.push({ command, args, options });
      return fakeChild();
    },
  });
  const result = await spawnShowmd("/doc.md", {}, deps);
  assert.equal(result.ok, false);
  assert.equal(result.port, undefined);
  assert.match(result.error, /EMFILE: too many open files/);
  assert.equal(spawnCalls.length, 0);
});

test("spawnShowmd: a port picker that never settles reports a timeout instead of hanging", async () => {
  let spawned = false;
  const deps = fakeDeps({
    pickPort: () => new Promise(() => {}),
    pickPortTimeoutMs: 5,
    spawnImpl: () => {
      spawned = true;
      return fakeChild();
    },
  });
  const timedOut = Symbol("test timed out waiting for spawnShowmd");
  const result = await Promise.race([
    spawnShowmd("/doc.md", {}, deps),
    new Promise((resolve) => setTimeout(() => resolve(timedOut), 50)),
  ]);

  assert.notEqual(result, timedOut, "spawnShowmd itself never settled");
  assert.equal(result.ok, false);
  assert.match(result.error, /timed out.*free port/i);
  assert.equal(spawned, false);
});

test("pickFreePort: abort closes a listener whose callbacks never settle", async () => {
  const controller = new AbortController();
  let listens = 0;
  let closes = 0;
  const server = {
    unref() {},
    once() {},
    listen() {
      listens += 1;
    },
    close() {
      closes += 1;
    },
  };

  const attempt = pickFreePort(controller.signal, () => server);
  assert.equal(listens, 1);
  controller.abort();

  await assert.rejects(attempt, /timed out.*free port/i);
  assert.equal(closes, 1);
});

test("spawnShowmdSkills: subcommand comes before --port, since bin/cli.js dispatches on argv[2]", async () => {
  const spawnCalls = [];
  const deps = fakeDeps({
    pickPort: async () => 61234,
    spawnImpl: (command, args, options) => {
      spawnCalls.push({ command, args, options });
      return fakeChild();
    },
  });
  const result = await spawnShowmdSkills({}, deps);
  assert.equal(result.ok, true);
  const args = spawnCalls[0].args;
  assert.deepEqual(args, ["skills", "--port", "61234", "--no-open"]);
});

test("isCommandNotFound: matches POSIX shape", () => {
  assert.equal(isCommandNotFound("sh: showmd: command not found"), true);
});

test("isCommandNotFound: matches Windows shape", () => {
  assert.equal(
    isCommandNotFound(
      "'showmd' is not recognized as an internal or external command,\r\noperable program or batch file.",
    ),
    true,
  );
});

test("isCommandNotFound: false for unrelated errors", () => {
  assert.equal(isCommandNotFound("EACCES: permission denied"), false);
});

function fakeChild() {
  const listeners = {};
  const child = {
    once: (event, cb) => {
      listeners[event] = cb;
      if (event === "spawn") setTimeout(() => cb(), 0);
      return child;
    },
    unref: () => {},
  };
  return child;
}

test("spawnShowmd: falls through the ladder past command-not-found errors", async () => {
  const attempted = [];
  const deps = fakeDeps({
    env: {},
    homedir: () => "/nonexistent-home",
    spawnImpl: (command) => {
      attempted.push(command);
      const listeners = {};
      return {
        once: (event, cb) => {
          listeners[event] = cb;
          if (attempted.length < 2 && event === "error") {
            setTimeout(
              () => cb(new Error(`sh: ${command}: command not found`)),
              0,
            );
          }
          if (attempted.length >= 2 && event === "spawn") {
            setTimeout(() => cb(), 0);
          }
          return this;
        },
        unref: () => {},
      };
    },
  });
  const result = await spawnShowmd("/doc.md", {}, deps);
  assert.equal(result.ok, true);
  assert.ok(attempted.length >= 2);
});

test("spawnShowmd: stops the ladder on a non-command-not-found error", async () => {
  const deps = fakeDeps({
    spawnImpl: () => ({
      once: (event, cb) => {
        if (event === "error")
          setTimeout(() => cb(new Error("EACCES: permission denied")), 0);
        return this;
      },
      unref: () => {},
    }),
  });
  const result = await spawnShowmd(
    "/doc.md",
    { showmdPath: "/custom/showmd" },
    deps,
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /EACCES/);
});

test("spawnShowmd: spawn env.PATH puts rebuilt candidate dirs first, inherited PATH last", async () => {
  const spawnCalls = [];
  const deps = fakeDeps({
    env: { PATH: "/existing/bin" },
    spawnImpl: (command, args, options) => {
      spawnCalls.push(options);
      return fakeChild();
    },
  });
  const result = await spawnShowmd(
    "/doc.md",
    { showmdPath: "/bin/showmd" },
    deps,
  );
  assert.equal(result.ok, true);
  const pathValue = spawnCalls[0].env.PATH;
  assert.ok(pathValue.startsWith("/opt/homebrew/bin" + path.delimiter));
  assert.ok(pathValue.endsWith(path.delimiter + "/existing/bin"));
});

function fakeChildWithStderr() {
  const listeners = {};
  const stderrListeners = {};
  return {
    stderr: {
      on: (event, cb) => {
        stderrListeners[event] = cb;
      },
      destroy: () => {},
    },
    once: (event, cb) => {
      listeners[event] = cb;
    },
    unref: () => {},
    emitSpawn() {
      listeners.spawn?.();
    },
    emitStderr(chunk) {
      stderrListeners.data?.(chunk);
    },
    emitExit(code, signal) {
      listeners.exit?.(code, signal);
    },
  };
}

test("trySpawn: exit inside the grace window reports startup failure with the stderr tail, ladder does not fall through", async () => {
  const attempts = [];
  let child;
  const deps = fakeDeps({
    sleepImpl: () => new Promise(() => {}), // never resolves: the exit must win the race
    spawnImpl: (command) => {
      attempts.push(command);
      child = fakeChildWithStderr();
      return child;
    },
  });
  const resultPromise = spawnShowmd(
    "/doc.md",
    { showmdPath: "/bin/showmd" },
    deps,
  );
  await new Promise((r) => setTimeout(r, 0));
  child.emitSpawn();
  child.emitStderr("env: node: No such file or directory\n");
  child.emitExit(127, null);
  const result = await resultPromise;
  assert.equal(result.ok, false);
  assert.match(result.error, /exited with code 127/);
  assert.match(result.error, /No such file or directory/);
  assert.equal(attempts.length, 1);
});

test("trySpawn: signal-killed exit inside the grace window names the signal", async () => {
  let child;
  const deps = fakeDeps({
    sleepImpl: () => new Promise(() => {}),
    spawnImpl: () => {
      child = fakeChildWithStderr();
      return child;
    },
  });
  const resultPromise = spawnShowmd(
    "/doc.md",
    { showmdPath: "/bin/showmd" },
    deps,
  );
  await new Promise((r) => setTimeout(r, 0));
  child.emitSpawn();
  child.emitExit(null, "SIGKILL");
  const result = await resultPromise;
  assert.equal(result.ok, false);
  assert.match(result.error, /signal SIGKILL/);
});

test("trySpawn: surviving the grace window with no exit resolves ok, and isCommandNotFound never matches an early-exit message", async () => {
  const deps = fakeDeps({
    spawnImpl: () => fakeChild(),
  });
  const result = await spawnShowmd(
    "/doc.md",
    { showmdPath: "/bin/showmd" },
    deps,
  );
  assert.equal(result.ok, true);
  assert.equal(
    isCommandNotFound(
      "exited with code 127 during startup: env: node: No such file or directory",
    ),
    false,
  );
});

test("readRecents: prefers the live server's list", async () => {
  const deps = fakeDeps({
    fetchImpl: async (url) => {
      if (url.endsWith("/api/version"))
        return {
          ok: true,
          json: async () => ({ version: "1.0.0", protocol: 1, mode: "shared" }),
        };
      if (url.endsWith("/api/recents")) {
        return {
          ok: true,
          json: async () => ({ recents: [{ path: "/a.md", ts: 1 }] }),
        };
      }
      throw new Error(`unexpected ${url}`);
    },
  });
  const recents = await readRecents({}, deps);
  assert.deepEqual(recents, [{ path: "/a.md", ts: 1 }]);
});

test("readRecents: falls back to parsing recents.json when no server runs", async () => {
  const deps = fakeDeps({
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
    readFile: async (p) => {
      if (p.endsWith("recents.json"))
        return JSON.stringify([{ path: "/b.md", ts: 2 }, { bad: true }]);
      throw new Error("ENOENT");
    },
  });
  const recents = await readRecents({}, deps);
  assert.deepEqual(recents, [{ path: "/b.md", ts: 2 }]);
});

test("readRecents: returns empty array when recents.json is missing", async () => {
  const deps = fakeDeps({
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  const recents = await readRecents({}, deps);
  assert.deepEqual(recents, []);
});

test("removeRecent: posts to the live server's delete endpoint", async () => {
  let posted = null;
  const deps = fakeDeps({
    fetchImpl: async (url, opts) => {
      if (url.endsWith("/api/version"))
        return {
          ok: true,
          json: async () => ({ version: "1.0.0", protocol: 1, mode: "shared" }),
        };
      if (url.endsWith("/api/recents/delete")) {
        posted = JSON.parse(opts.body);
        return { ok: true, json: async () => ({ ok: true }) };
      }
      throw new Error(`unexpected ${url}`);
    },
  });
  const ok = await removeRecent("/a.md", {}, deps);
  assert.equal(ok, true);
  assert.deepEqual(posted, { path: "/a.md" });
});

test("removeRecent: rewrites recents.json when no server runs", async () => {
  let written = null;
  const deps = fakeDeps({
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
    readFile: async (p) => {
      if (p.endsWith("recents.json"))
        return JSON.stringify([
          { path: "/a.md", ts: 1 },
          { path: "/b.md", ts: 2 },
        ]);
      throw new Error("ENOENT");
    },
    writeFile: async (p, contents) => {
      written = { path: p, contents };
    },
  });
  const ok = await removeRecent("/a.md", {}, deps);
  assert.equal(ok, true);
  assert.deepEqual(JSON.parse(written.contents), [{ path: "/b.md", ts: 2 }]);
});

test("getManageStatus: reports every live server", async () => {
  const deps = registryDeps({
    registry: {
      "111.json": { port: 5001, pid: 111 },
      "222.json": { port: 5002, pid: 222 },
    },
    prefFetch: combine(
      serverAt(5001, "shared", [
        { key: "r1", dir: "/y", name: "y", url: "/r/r1/" },
      ]),
      serverAt(5002, "dedicated"),
    ),
  });
  const status = await getManageStatus({}, deps);
  assert.equal(status.running, true);
  assert.equal(status.servers.length, 2);
  assert.deepEqual(status.servers.map((s) => s.mode).sort(), [
    "dedicated",
    "shared",
  ]);
});

test("getManageStatus: not running when every probe fails", async () => {
  const deps = registryDeps({
    prefFetch: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  const status = await getManageStatus({}, deps);
  assert.equal(status.running, false);
  assert.deepEqual(status.servers, []);
});

test("diffSettings: only changed keys are included", () => {
  const original = {
    colorMode: "system",
    openMode: "read",
    fontPreset: "default",
    fontSize: 15.5,
    browser: "default",
    port: 4321,
    updateCheck: true,
  };
  const current = { ...original, colorMode: "dark", fontSize: 18 };
  assert.deepEqual(diffSettings(original, current), {
    colorMode: "dark",
    fontSize: 18,
  });
});

test("diffSettings: no changes returns an empty object", () => {
  const original = {
    colorMode: "system",
    openMode: "read",
    fontPreset: "default",
    fontSize: 15.5,
    browser: "default",
    port: 4321,
    updateCheck: true,
  };
  assert.deepEqual(diffSettings(original, { ...original }), {});
});

test("waitForServer: finds a port once it starts answering", async () => {
  let versionCalls = 0;
  const sleeps = [];
  const deps = fakeDeps({
    sleepImpl: async (ms) => {
      sleeps.push(ms);
    },
    fetchImpl: async (url) => {
      if (url.endsWith("/api/version")) {
        versionCalls++;
        if (versionCalls < 3) throw new Error("ECONNREFUSED");
        return {
          ok: true,
          json: async () => ({ version: "1.0.0", protocol: 1, mode: "shared" }),
        };
      }
      if (url.endsWith("/api/roots"))
        return { ok: true, json: async () => ({ roots: [] }) };
      throw new Error(`unexpected ${url}`);
    },
  });
  const status = await waitForServer({}, { deps, timeoutMs: 10000, want: "running" });
  assert.equal(status.running, true);
  assert.equal(versionCalls, 3);
  assert.equal(sleeps.length, 2);
});

test("waitForServer: respects the timeout and gives up", async () => {
  let sleeps = 0;
  const deps = fakeDeps({
    sleepImpl: async () => {
      sleeps++;
    },
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  const status = await waitForServer({}, { deps, timeoutMs: 0, want: "running" });
  assert.equal(status.running, false);
  assert.equal(sleeps, 0);
});

test("waitForServer: can wait for the server to stop", async () => {
  let calls = 0;
  const deps = fakeDeps({
    sleepImpl: async () => {},
    fetchImpl: async () => {
      calls++;
      if (calls < 2)
        return { ok: true, json: async () => ({ version: "1.0.0" }) };
      throw new Error("ECONNREFUSED");
    },
  });
  const status = await waitForServer({}, { deps, timeoutMs: 10000, want: "stopped" });
  assert.equal(status.running, false);
});

test("pickSelectionTarget: picks the first markdown file or directory", () => {
  const { target, skipped } = pickSelectionTarget([
    { path: "/a.txt", isDirectory: false },
    { path: "/b.md", isDirectory: false },
    { path: "/c.md", isDirectory: false },
  ]);
  assert.equal(target, "/b.md");
  assert.equal(skipped, 2);
});

test("pickSelectionTarget: a directory counts as valid", () => {
  const { target, skipped } = pickSelectionTarget([
    { path: "/some/dir", isDirectory: true },
  ]);
  assert.equal(target, "/some/dir");
  assert.equal(skipped, 0);
});

test("pickSelectionTarget: no valid item returns null and zero skipped", () => {
  const { target, skipped } = pickSelectionTarget([
    { path: "/a.txt", isDirectory: false },
    { path: "/b.png", isDirectory: false },
  ]);
  assert.equal(target, null);
  assert.equal(skipped, 0);
});

test("describeStatus: not running", () => {
  assert.equal(describeStatus({ running: false, servers: [] }), "Not running");
});

test("describeStatus: one server serving a single root", () => {
  const status = {
    running: true,
    servers: [
      {
        port: 4321,
        version: "1.0.0",
        roots: [{ key: "r1", dir: "/notes", name: "notes", url: "/r/r1/" }],
      },
    ],
  };
  assert.equal(describeStatus(status), "Showing notes");
});

test("describeStatus: one rootless (Home) server running", () => {
  const status = {
    running: true,
    servers: [{ port: 4321, version: "1.0.0", roots: [] }],
  };
  assert.equal(describeStatus(status), "Home");
});

test("describeStatus: multiple instances running reports a count", () => {
  const status = {
    running: true,
    servers: [
      {
        port: 4321,
        version: "1.0.0",
        roots: [{ key: "r1", dir: "/notes", name: "notes", url: "/r/r1/" }],
      },
      { port: 4322, version: "1.0.0", roots: [] },
    ],
  };
  assert.equal(describeStatus(status), "Running (2)");
});

test("labelForServer: no roots is Home", () => {
  assert.equal(labelForServer({ port: 4321, roots: [] }), "Home");
});

test("labelForServer: several roots summarizes the count", () => {
  assert.equal(
    labelForServer({
      port: 4321,
      roots: [
        { key: "r1", dir: "/a", name: "a", url: "/r/r1/" },
        { key: "r2", dir: "/b", name: "b", url: "/r/r2/" },
      ],
    }),
    "Showing 2 folders",
  );
});

test("describeMenuBar: stopped state", () => {
  const status = { running: false, servers: [] };
  assert.deepEqual(describeMenuBar(status), {
    running: false,
    title: "ShowMD (stopped)",
    subtitle: "Not running",
    version: undefined,
    count: 0,
  });
});

test("describeMenuBar: running state carries version", () => {
  const status = {
    running: true,
    servers: [
      {
        port: 4321,
        version: "1.2.3",
        roots: [{ key: "r1", dir: "/notes", name: "notes", url: "/r/r1/" }],
      },
    ],
  };
  assert.deepEqual(describeMenuBar(status), {
    running: true,
    title: "ShowMD",
    subtitle: "Showing notes",
    version: "1.2.3",
    count: 1,
  });
});

test("describeMenuBar: multiple instances show the count in the compact title", () => {
  const status = {
    running: true,
    servers: [
      {
        port: 4321,
        version: "1.2.3",
        roots: [{ key: "r1", dir: "/notes", name: "notes", url: "/r/r1/" }],
      },
      { port: 4322, version: "1.2.3", roots: [] },
    ],
  };
  const menuBar = describeMenuBar(status);
  assert.equal(menuBar.title, "ShowMD (2)");
  assert.equal(menuBar.count, 2);
});

test("detectInstalledBrowsers: darwin finds only the .app bundles that exist", () => {
  const installed = new Set([
    "/Applications/Safari.app",
    "/Applications/Google Chrome.app",
  ]);
  const found = detectInstalledBrowsers(
    fakeDeps({
      platform: "darwin",
      existsSync: (p) => installed.has(p),
    }),
  );
  assert.deepEqual(found, ["Safari", "Google Chrome"]);
});

test("detectInstalledBrowsers: also checks the user's ~/Applications", () => {
  const found = detectInstalledBrowsers(
    fakeDeps({
      platform: "darwin",
      homedir: () => "/Users/test",
      existsSync: (p) => p === "/Users/test/Applications/Arc.app",
    }),
  );
  assert.deepEqual(found, ["Arc"]);
});

test("detectInstalledBrowsers: non-darwin returns nothing, since detection is macOS-only", () => {
  const found = detectInstalledBrowsers(
    fakeDeps({ platform: "linux", existsSync: () => true }),
  );
  assert.deepEqual(found, []);
});

test("browserOptions: leads with default, then detected browsers", () => {
  assert.deepEqual(browserOptions(["Safari", "Arc"], "default"), [
    "default",
    "Safari",
    "Arc",
  ]);
});

test("browserOptions: appends the saved value if detection missed it, so the form never silently changes a working setting", () => {
  assert.deepEqual(browserOptions(["Safari"], "Orion"), [
    "default",
    "Safari",
    "Orion",
  ]);
});

test("browserOptions: does not duplicate the saved value when it was already detected", () => {
  assert.deepEqual(browserOptions(["Safari", "Arc"], "Arc"), [
    "default",
    "Safari",
    "Arc",
  ]);
});

test("fetchWithTimeout: rejects within the timeout when fetchImpl never resolves", async () => {
  const neverResolvingFetch = (url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () =>
        reject(new Error("AbortError")),
      );
    });
  const start = Date.now();
  await assert.rejects(
    fetchWithTimeout(
      neverResolvingFetch,
      "http://127.0.0.1:4321/api/version",
      {},
      30,
    ),
  );
  assert.ok(Date.now() - start < 1000);
});

test("resolveBinary: ladder order is preference, then PATH candidates including /opt/homebrew/bin, then npx", () => {
  const ladder = resolveBinary(
    { showmdPath: "/custom/showmd" },
    fakeDeps({ platform: "darwin", env: {} }),
  );
  assert.equal(ladder[0].command, "/custom/showmd");
  const homebrewIndex = ladder.findIndex(
    (c) => c.command === "/opt/homebrew/bin/showmd",
  );
  const bareShowmdIndex = ladder.findIndex((c) => c.command === "showmd");
  const bareNpxIndex = ladder.findIndex(
    (c) => c.command === "npx" && c.args.includes("-y"),
  );
  assert.ok(homebrewIndex > 0, "homebrew showmd candidate is present");
  assert.ok(homebrewIndex < bareShowmdIndex);
  assert.ok(bareShowmdIndex < bareNpxIndex);
  assert.equal(bareNpxIndex, ladder.length - 1, "bare npx is the last rung");
});

test("resolveBinary: npx rung reuses the same rebuilt dirs as the showmd rungs", () => {
  const ladder = resolveBinary({}, fakeDeps({ platform: "darwin", env: {} }));
  const homebrewNpxIndex = ladder.findIndex(
    (c) => c.command === "/opt/homebrew/bin/npx",
  );
  assert.ok(
    homebrewNpxIndex > 0,
    "npx is tried at every showmd candidate dir, including /opt/homebrew/bin",
  );
  assert.deepEqual(ladder[homebrewNpxIndex].args, ["-y", "showmd-cli"]);
});

test("isCommandNotFound: matches Node's real spawn ENOENT message shape", () => {
  // This is the actual shape Node produces for a missing binary on every
  // platform, not the shell-only "command not found" text: reproduces the
  // real bug, where the ladder used to stop at the first missing rung.
  assert.equal(isCommandNotFound("spawn showmd ENOENT"), true);
  assert.equal(
    isCommandNotFound("spawn /opt/homebrew/bin/showmd ENOENT"),
    true,
  );
});

test("spawnShowmd: falls through real ENOENT-shaped errors all the way to a working rung", async () => {
  const attempted = [];
  const deps = fakeDeps({
    platform: "darwin",
    env: {},
    spawnImpl: (command) => {
      attempted.push(command);
      const isHomebrewShowmd = command === "/opt/homebrew/bin/showmd";
      return {
        once: (event, cb) => {
          if (!isHomebrewShowmd && event === "error") {
            setTimeout(() => cb(new Error(`spawn ${command} ENOENT`)), 0);
          }
          if (isHomebrewShowmd && event === "spawn") {
            setTimeout(() => cb(), 0);
          }
          return this;
        },
        unref: () => {},
      };
    },
  });
  const result = await spawnShowmd("/doc.md", {}, deps);
  assert.equal(result.ok, true);
  assert.equal(result.command, "/opt/homebrew/bin/showmd");
  assert.ok(attempted.includes("/opt/homebrew/bin/showmd"));
});

test("spawnShowmd: not-found error only surfaces after the npx rung was actually attempted and failed", async () => {
  const attempted = [];
  const deps = fakeDeps({
    platform: "darwin",
    env: {},
    spawnImpl: (command) => {
      attempted.push(command);
      return {
        once: (event, cb) => {
          if (event === "error")
            setTimeout(() => cb(new Error(`spawn ${command} ENOENT`)), 0);
          return this;
        },
        unref: () => {},
      };
    },
  });
  const result = await spawnShowmd("/doc.md", {}, deps);
  assert.equal(result.ok, false);
  assert.ok(
    attempted.includes("npx"),
    "the bare npx rung must have been attempted before giving up",
  );
  assert.equal(attempted[attempted.length - 1], "npx");
  assert.match(result.error, /not found/i);
  assert.match(result.error, /npx/);
  assert.match(result.error, /ShowMD Path/);
});
