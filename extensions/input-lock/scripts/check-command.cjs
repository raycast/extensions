const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const { join } = require("node:path");
const ts = require("typescript");

const sourcePath = join(__dirname, "../src/lock-inputs.ts");
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const tick = () => new Promise((resolve) => setImmediate(resolve));

function run(confirmed) {
  const confirmations = [];
  const spawns = [];
  const huds = [];
  let finishHUD;
  const finalHUD = new Promise((resolve) => {
    finishHUD = resolve;
  });
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdout.setEncoding = child.stderr.setEncoding = () => {};
  const commandModule = new Module(sourcePath, module);
  commandModule.filename = sourcePath;
  commandModule.paths = module.paths;
  commandModule.require = (name) => {
    if (name === "@raycast/api")
      return {
        Alert: { ActionStyle: { Cancel: "cancel" } },
        environment: { assetsPath: "/test/assets" },
        confirmAlert: async (options) => {
          confirmations.push(options);
          return confirmed;
        },
        showHUD: async (message) => {
          huds.push(message);
          if (message === "Inputs unlocked with Touch ID") await finalHUD;
        },
      };
    if (name === "node:child_process")
      return {
        spawn: (...arguments) => {
          spawns.push(arguments);
          return child;
        },
      };
    return require(name);
  };
  commandModule._compile(compiled, sourcePath);
  return {
    command: commandModule.exports.default,
    confirmations,
    spawns,
    huds,
    child,
    finishHUD,
  };
}

(async () => {
  const confirmed = run(true);
  let settled = false;
  const command = confirmed.command().then(() => {
    settled = true;
  });
  await tick();
  assert.equal(
    confirmed.confirmations[0]?.primaryAction?.title,
    "Lock Inputs",
    "confirmation must offer Lock Inputs",
  );
  assert.equal(
    confirmed.spawns.length,
    1,
    "confirmation must start one helper",
  );
  assert.deepEqual(
    confirmed.spawns[0][1],
    ["--lock"],
    "confirmation must lock directly",
  );
  assert.equal(settled, false, "command must keep the helper alive");
  confirmed.child.stdout.emit(
    "data",
    '{"phase":"locked","message":"locked"}\n{"phase":"ready","message":"released","reason":"touchID"}\n',
  );
  confirmed.child.emit("close", 0, null);
  await tick();
  assert.equal(
    confirmed.huds.at(-1),
    "Inputs unlocked with Touch ID",
    "helper exit must show its final HUD",
  );
  assert.equal(
    settled,
    false,
    "command must await the final HUD after helper exit",
  );
  confirmed.finishHUD();
  await command;

  const cancelled = run(false);
  await cancelled.command();
  assert.equal(cancelled.confirmations[0]?.primaryAction?.title, "Lock Inputs");
  assert.equal(cancelled.spawns.length, 0, "cancel must not start a helper");
  console.log(
    "command check passed: direct lock, cancel, helper lifetime, final HUD",
  );
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
