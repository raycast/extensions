const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");
const Module = require("node:module");
const ts = require("typescript");

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "promptcast-bridge-"));
  const home = path.join(root, "profile with ' quote");
  const supportPath = path.join(root, "support");
  const assetsPath = path.resolve(__dirname, "../assets");
  const compiled = new Map();
  function load(name) {
    if (compiled.has(name)) return compiled.get(name).exports;
    const filename = path.resolve(__dirname, `../src/lib/${name}.ts`);
    const mod = new Module(filename, module);
    compiled.set(name, mod);
    mod.filename = filename;
    mod.paths = module.paths;
    mod.require = (id) => {
      if (id === "@raycast/api")
        return { environment: { supportPath, assetsPath }, getPreferenceValues: () => ({ claudeHome: home }) };
      if (id.startsWith("./claude-statusline")) return load(id.slice(2));
      return require(id);
    };
    mod._compile(
      ts.transpileModule(require("node:fs").readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
      }).outputText,
      filename,
    );
    return mod.exports;
  }
  const api = load("claude-statusline");
  const bridge = load("claude-statusline-bridge");
  const options = { claudeConfigDir: home, bridgeDirectory: path.join(supportPath, "claude-statusline") };
  const paths = bridge.claudeBridgePaths(options);
  const read = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
  const write = (file, value) => fs.writeFile(file, JSON.stringify(value));
  try {
    assert.equal(await api.readClaudeStatusLineUsage(), undefined);
    await fs.mkdir(home, { recursive: true });
    const original = { type: "command", command: "cat", padding: 2 };
    await write(paths.settings, { statusLine: original, theme: "dark" });
    await api.connectClaudeStatusLine();
    const installed = await read(paths.settings);
    assert.equal(installed.theme, "dark");
    assert.equal(installed.statusLine.padding, 2);
    assert.equal((await api.readClaudeStatusLineUsage()).bridgeConnected, true);
    assert.equal((await api.readClaudeStatusLineUsage()).source, "unavailable");
    const payload = JSON.stringify({
      transcript_path: "/never/save",
      session_id: "private",
      rate_limits: {
        five_hour: { used_percentage: 25, resets_at: Date.now() / 1000 + 3600 },
        seven_day: { used_percentage: 40, resets_at: Date.now() / 1000 + 86400 },
        seven_day_opus: { used_percentage: 5 },
      },
    });
    const output = execFileSync("/bin/sh", ["-c", installed.statusLine.command], { input: payload, encoding: "utf8" });
    assert.equal(output, payload, "existing status line receives exact stdin and retains stdout");
    const saved = await read(paths.snapshot);
    assert.deepEqual(Object.keys(saved).sort(), ["connectionId", "rate_limits", "updatedAt"]);
    assert.deepEqual(Object.keys(saved.rate_limits).sort(), ["five_hour", "seven_day"]);
    const fresh = await api.readClaudeStatusLineUsage();
    assert.equal(fresh.source, "live");
    assert.equal(fresh.data.windows[0].remainingPercent, 75);
    assert.equal(fresh.data.windows[1].durationMinutes, 10080);
    const expired = {
      ...saved,
      rate_limits: {
        five_hour: { used_percentage: 25, resets_at: Date.now() / 1000 - 60 },
        seven_day: { used_percentage: 40, resets_at: Date.now() / 1000 - 30 },
      },
    };
    await write(paths.snapshot, expired);
    const historical = await api.readClaudeStatusLineUsage();
    assert.equal(historical.source, "stale");
    assert.equal(historical.data.fetchedAt, Date.parse(saved.updatedAt));
    assert.deepEqual(
      historical.data.windows.map((window) => window.remainingPercent),
      [75, 60],
    );
    await write(paths.snapshot, {
      ...expired,
      rate_limits: { ...expired.rate_limits, seven_day: saved.rate_limits.seven_day },
    });
    const mixed = await api.readClaudeStatusLineUsage();
    assert.equal(mixed.source, "live");
    assert.equal(mixed.data.windows.length, 2);
    await write(paths.snapshot, { ...saved, updatedAt: new Date(Date.now() - 16 * 60000).toISOString() });
    assert.equal((await api.readClaudeStatusLineUsage()).source, "stale");
    await write(paths.snapshot, { ...saved, updatedAt: new Date(Date.now() + 600000).toISOString() });
    assert.equal((await api.readClaudeStatusLineUsage()).source, "unavailable");
    await write(paths.snapshot, {
      ...saved,
      rate_limits: { five_hour: { used_percentage: -1, resets_at: Date.now() / 1000 + 3600 } },
    });
    assert.equal((await api.readClaudeStatusLineUsage()).source, "unavailable");
    // cat echoes a partial payload only after the wrapper has loaded its state.
    // This synchronizes the old invocation without timing-based sleeps.
    const delayed = spawn("/bin/sh", ["-c", installed.statusLine.command], { stdio: ["pipe", "pipe", "pipe"] });
    const started = new Promise((resolve, reject) => {
      delayed.stdout.once("data", resolve);
      delayed.once("error", reject);
    });
    const finished = new Promise((resolve, reject) => {
      delayed.once("close", resolve);
      delayed.once("error", reject);
    });
    delayed.stdin.write(payload.slice(0, 1));
    await started;
    await api.disconnectClaudeStatusLine();
    await api.connectClaudeStatusLine();
    assert.notEqual((await read(paths.state)).connectionId, saved.connectionId);
    delayed.stdin.end(payload.slice(1));
    await finished;
    assert.equal(
      await fs.stat(paths.snapshot).then(
        () => true,
        () => false,
      ),
      false,
    );
    assert.equal((await api.readClaudeStatusLineUsage()).source, "unavailable");
    // Even a late rename after the writer's generation check cannot be accepted.
    await write(paths.snapshot, saved);
    assert.equal((await api.readClaudeStatusLineUsage()).source, "unavailable");
    const currentCommand = (await read(paths.settings)).statusLine.command;
    execFileSync("/bin/sh", ["-c", currentCommand], { input: payload });
    assert.equal((await api.readClaudeStatusLineUsage()).source, "live");
    const currentState = await read(paths.state);
    delete currentState.connectionId;
    await write(paths.state, currentState);
    const legacy = await api.readClaudeStatusLineUsage();
    assert.equal(legacy.bridgeConnected, true);
    assert.equal(legacy.needsConnection, true);
    assert.match(legacy.error, /Reconnect/);
    await api.connectClaudeStatusLine();
    assert.deepEqual((await read(paths.state)).original, original, "reconnect never nests wrappers");
    await api.disconnectClaudeStatusLine();
    assert.deepEqual((await read(paths.settings)).statusLine, original);
    assert.equal(await api.readClaudeStatusLineUsage(), undefined);
    assert.equal(
      await fs.stat(paths.snapshot).then(
        () => true,
        () => false,
      ),
      false,
    );
    await api.connectClaudeStatusLine();
    const replacement = { type: "command", command: "printf changed" };
    await write(paths.settings, { statusLine: replacement });
    const conflict = await api.readClaudeStatusLineUsage();
    assert.equal(conflict.bridgeConnected, true);
    assert.match(conflict.error, /changed/);
    await assert.rejects(api.connectClaudeStatusLine(), /changed/);
    await api.disconnectClaudeStatusLine();
    assert.deepEqual((await read(paths.settings)).statusLine, replacement);
    await fs.writeFile(paths.state, "invalid json");
    assert.equal((await api.readClaudeStatusLineUsage()).bridgeConnected, true);
    await fs.unlink(paths.state);
    await fs.unlink(paths.settings);
    await fs.symlink(path.join(root, "absent"), paths.settings);
    await assert.rejects(api.connectClaudeStatusLine(), /safely/);
    await fs.unlink(paths.settings);
    await fs.writeFile(
      path.join(paths.directory, "connect.lock"),
      JSON.stringify({ pid: process.pid, token: "another" }),
    );
    await assert.rejects(api.connectClaudeStatusLine(), /already/);
    await fs.unlink(path.join(paths.directory, "connect.lock"));
    await api.connectClaudeStatusLine();
    await api.disconnectClaudeStatusLine();
    assert.deepEqual(await read(paths.settings), {});
    // Inject an unrelated writer after the staged settings fsync. The final
    // identity/content check must reject publishing over that writer.
    const realOpen = fs.open;
    let injected = false;
    fs.open = async (...args) => {
      const handle = await realOpen(...args);
      if (String(args[0]).startsWith(`${paths.settings}.`) && args[1] === "wx") {
        const sync = handle.sync.bind(handle);
        handle.sync = async () => {
          await sync();
          if (!injected) {
            injected = true;
            await write(paths.settings, { external: "preserved" });
          }
        };
      }
      return handle;
    };
    try {
      await assert.rejects(api.connectClaudeStatusLine(), /changed while updating/);
      assert.deepEqual(await read(paths.settings), { external: "preserved" });
    } finally {
      fs.open = realOpen;
    }
    await api.disconnectClaudeStatusLine();
    const concurrent = await Promise.allSettled([api.connectClaudeStatusLine(), api.connectClaudeStatusLine()]);
    assert.ok(concurrent.some((result) => result.status === "fulfilled"));
    assert.equal((await read(paths.state)).hadOriginal, false);
    await api.disconnectClaudeStatusLine();
    assert.deepEqual(await read(paths.settings), { external: "preserved" });
    const unsafeState = path.join(root, "unsafe-state");
    const unsafeSnapshot = path.join(root, "unsafe-snapshot");
    await fs.symlink(paths.state, unsafeState);
    execFileSync(process.execPath, [path.join(assetsPath, "claude-statusline.cjs"), unsafeState, unsafeSnapshot], {
      input: payload,
      timeout: 3000,
    });
    assert.equal(
      await fs.stat(unsafeSnapshot).then(
        () => true,
        () => false,
      ),
      false,
    );
    await fs.unlink(unsafeState);
    execFileSync("mkfifo", [unsafeState]);
    execFileSync(process.execPath, [path.join(assetsPath, "claude-statusline.cjs"), unsafeState, unsafeSnapshot], {
      input: payload,
      timeout: 3000,
    });
    assert.equal(
      await fs.stat(unsafeSnapshot).then(
        () => true,
        () => false,
      ),
      false,
    );
    console.log(
      "Claude status-line regressions passed: connection, exact passthrough, quota-only persistence, freshness, validation, restore, conflict, malformed state, symlink rejection, active lock, absent settings.",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
