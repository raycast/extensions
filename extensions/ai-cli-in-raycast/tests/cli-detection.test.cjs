require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  CLI_DEFINITIONS,
  detectCli,
  CliDetectionController,
} = require("../src/cli-detection.ts");
const { workBuddyRootsFromMetadata } = require("../src/cli-executable.ts");

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("detection honors configured paths without silently falling back to automatic discovery", async () => {
  const preferences = { qoderCnPath: "  E:/My CLI/qoderclicn.js  " };
  const calls = [];
  const result = await detectCli(
    "qoder-cn",
    preferences,
    async (provider, explicit) => {
      calls.push([provider, explicit]);
      throw new Error("configured file is missing");
    },
  );
  assert.deepEqual(calls, [["qoder-cn", "E:/My CLI/qoderclicn.js"]]);
  assert.equal(result.source, "manual");
  assert.equal(result.status, "not-found");
  assert.equal(result.error, "configured file is missing");
  assert.equal(preferences.qoderCnPath, "  E:/My CLI/qoderclicn.js  ");
  assert.equal("authenticated" in result, false);
});

test("disabled automatic discovery requires a manual path and does not call a resolver", async () => {
  let calls = 0;
  const resolver = async () => {
    calls++;
    return { command: "/node", prefix: ["/cli.js"] };
  };
  const missing = await detectCli("gemini", { autoDetectCli: false }, resolver);
  assert.equal(missing.status, "manual-required");
  assert.equal(calls, 0);
  const configured = await detectCli(
    "gemini",
    { autoDetectCli: false, geminiPath: "/cli.js" },
    resolver,
  );
  assert.equal(calls, 1);
  assert.equal(configured.status, "found");
  assert.equal(configured.path, "/cli.js");
  assert.equal(configured.runtime, "/node");
});

test("all six providers use their matching path preference and return actual entrypoints", async () => {
  for (const entry of CLI_DEFINITIONS) {
    const path = `/configured/${entry.id}`;
    const result = await detectCli(
      entry.id,
      { [entry.preference]: path },
      async (provider, explicit) => {
        assert.equal(provider, entry.id);
        assert.equal(explicit, path);
        return { command: '"/native executable"' };
      },
    );
    assert.equal(result.path, "/native executable");
    assert.equal(result.source, "manual");
    assert.equal(result.status, "found");
    assert.equal(typeof result.checkedAt, "number");
  }
});

test("new refresh suppresses every late result and completion from the previous scan", async () => {
  const gate = deferred();
  let useOld = true;
  const controller = new CliDetectionController(async (provider) => {
    if (useOld) await gate.promise;
    return { command: `${useOld ? "old" : "new"}/${provider}` };
  });
  const oldResults = [];
  const oldScan = controller.scan({}, (result) => oldResults.push(result));
  useOld = false;
  const newResults = [];
  const fresh = await controller.scan({}, (result) => newResults.push(result));
  gate.resolve();
  assert.equal(await oldScan, undefined);
  assert.equal(oldResults.length, 0);
  assert.equal(newResults.length, 6);
  assert.equal(fresh.length, 6);
  assert.ok(fresh.every((result) => result.path.startsWith("new/")));
});

test("disposing a pending scan prevents updates and snapshots its starting preferences", async () => {
  const gate = deferred();
  const seen = [];
  const preferences = { codexPath: "/old/codex" };
  const controller = new CliDetectionController(async (provider, explicit) => {
    seen.push([provider, explicit]);
    await gate.promise;
    return { command: "/resolved" };
  });
  const updates = [];
  const scan = controller.scan(preferences, (result) => updates.push(result));
  preferences.codexPath = "/changed/codex";
  controller.cancel();
  gate.resolve();
  assert.equal(await scan, undefined);
  assert.equal(updates.length, 0);
  assert.deepEqual(
    seen.find(([id]) => id === "codex"),
    ["codex", "/old/codex"],
  );
});

test("WorkBuddy custom install discovery uses matching installed-app and process metadata only", () => {
  const roots = workBuddyRootsFromMetadata([
    {
      displayName: "WorkBuddy AI 5.8.4",
      displayIcon: "E:\\WorkBuddy-AI\\WorkBuddyAI.exe,0",
    },
    { displayName: "WorkBuddy", installLocation: '"D:\\Apps\\WorkBuddy"' },
    { processPath: "E:\\WorkBuddy-AI\\WorkBuddyAI.exe" },
    {
      displayName: "Foreign App",
      installLocation: "D:\\Foreign",
      displayIcon: "D:\\Foreign\\app.exe",
    },
    { displayName: "WorkBuddy", installLocation: "relative\\path" },
    { processPath: "E:\\Other\\some.exe" },
    null,
  ]);
  assert.deepEqual(roots, ["E:\\WorkBuddy-AI", "D:\\Apps\\WorkBuddy"]);
  assert.deepEqual(workBuddyRootsFromMetadata("invalid JSON result"), []);
});

test("automatic detection resolves the same production executable as chat without starting it", async () => {
  const { resolveCodexExecutable } = require("../src/executable.ts");
  const result = await detectCli("codex", { codexPath: process.execPath });
  const resolved = await resolveCodexExecutable(process.execPath);
  assert.equal(result.status, "found");
  assert.equal(result.path, resolved.command);
});
