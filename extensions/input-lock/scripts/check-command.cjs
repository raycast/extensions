const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const { join } = require("node:path");
const ts = require("typescript");

const sourcePath = join(__dirname, "../src/lock-inputs.tsx");
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
const tick = () => new Promise((resolve) => setImmediate(resolve));
const timedDuration = "600";

function run() {
  const spawns = [];
  const huds = [];
  const state = [];
  let hookIndex = 0;
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
        environment: { assetsPath: "/test/assets" },
        List: Object.assign(() => {}, { Section: "section", Item: "item" }),
        Action: "action",
        ActionPanel: "actions",
        confirmAlert: async () => {
          assert.fail("locking must not require a confirmation dialog");
        },
        showHUD: async (message) => {
          huds.push(message);
          if (message === "Inputs unlocked with Touch ID") await finalHUD;
        },
      };
    if (name === "react")
      return {
        useRef: (initial) => {
          const index = hookIndex++;
          if (index >= state.length) state.push({ current: initial });
          return state[index];
        },
      };
    if (name === "react/jsx-runtime")
      return {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
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
    command: commandModule.exports.lockInputs,
    view: () => {
      hookIndex = 0;
      return commandModule.exports.default();
    },
    spawns,
    huds,
    child,
    finishHUD,
  };
}

async function checkSignalExit() {
  const test = run();
  const command = test.command(timedDuration);
  await tick();
  test.child.emit("close", null, "SIGKILL");
  await command;
  assert.equal(
    test.huds.at(-1),
    "Input Lock failed: helper terminated by SIGKILL",
    "signal exits must name the signal",
  );
}

async function checkTrailingRecord(endStdout) {
  const test = run();
  let settled = false;
  const command = test.command(timedDuration).then(() => {
    settled = true;
  });
  await tick();
  test.child.stdout.emit(
    "data",
    '{"phase":"locked","message":"locked"}\n{"phase":"rea',
  );
  await tick();
  assert.equal(test.huds.includes("Inputs unlocked with Touch ID"), false);
  test.child.stdout.emit(
    "data",
    'dy","message":"released","reason":"touchID"}',
  );
  if (endStdout) test.child.stdout.emit("end");
  test.child.emit("close", 0, null);
  await tick();
  try {
    assert.equal(
      test.huds.at(-1),
      "Inputs unlocked with Touch ID",
      "final unterminated record must be handled",
    );
    assert.equal(
      test.huds.filter((message) => message === "Inputs unlocked with Touch ID")
        .length,
      1,
      "stdout end and child close must not duplicate the final HUD",
    );
    assert.equal(
      settled,
      false,
      "final trailing HUD must be awaited after child exit",
    );
  } finally {
    test.finishHUD();
    await command;
  }
}

async function checkDurations() {
  const choices = [
    { title: "10 minutes", value: "600" },
    { title: "30 minutes", value: "1800" },
    { title: "60 minutes", value: "3600" },
    { title: "2 hours", value: "7200" },
    { title: "5 hours", value: "18000" },
    { title: "Indefinitely", value: "indefinite" },
  ];
  const manifest = JSON.parse(
    readFileSync(join(__dirname, "../package.json"), "utf8"),
  );
  assert.equal(manifest.commands[0].mode, "view");
  assert.equal(Object.hasOwn(manifest.commands[0], "arguments"), false);
  const test = run();
  const list = test.view();
  assert.equal(list.props.children.type, "section");
  assert.ok(
    list.props.children.props.subtitle.includes("Triple-tap Command for Touch ID"),
  );
  assert.ok(
    list.props.children.props.subtitle.includes("scrolling stays available"),
  );
  const items = list.props.children.props.children;
  assert.equal(items.length, 6);
  assert.deepEqual(
    items.map(({ props }) => props.title),
    choices.map(({ title }) => title),
  );
  assert.equal(items.at(-1).props.subtitle, "No automatic expiry");
  assert.equal(test.spawns.length, 0, "browsing must not start a helper");
  assert.equal(test.huds.length, 0, "browsing must not close the list");
  for (const { value } of choices) {
    const test = run();
    const items = test.view().props.children.props.children;
    const action =
      items[choices.findIndex((choice) => choice.value === value)].props.actions
        .props.children;
    assert.equal(action.props.title, "Lock Inputs");
    const command = action.props.onAction();
    await tick();
    assert.equal(test.spawns.length, 1);
    assert.equal(test.spawns[0][0], "/test/assets/input-lock");
    assert.deepEqual(test.spawns[0][1], ["--lock", value]);
    test.child.emit("close", 0, null);
    await command;
  }
}

async function checkInvalidDurations() {
  for (const duration of [
    undefined,
    null,
    {},
    "",
    "invalid",
    "0600",
    "600 ",
    "0",
    "-1",
    "Infinity",
    "toString",
    "__proto__",
    600,
  ]) {
    const test = run();
    await test.command(duration);
    assert.equal(
      test.spawns.length,
      0,
      "invalid duration must not start a helper",
    );
    assert.deepEqual(test.huds, [
      "Choose a lock duration before starting Input Lock.",
    ]);
  }
}

async function checkRecovery() {
  for (const [reason, message] of [
    ["timeout", "Inputs unlocked automatically: duration ended"],
    ["watchdog", "Inputs unlocked automatically: helper recovery"],
  ]) {
    for (const [code, signal] of [
      [0, null],
      [1, null],
      [null, "SIGKILL"],
    ]) {
      const test = run();
      const command = test.command(timedDuration);
      await tick();
      test.child.stdout.emit(
        "data",
        `{"phase":"ready","message":"released","reason":"${reason}"}\n`,
      );
      test.child.emit("close", code, signal);
      await command;
      assert.equal(test.huds.at(-1), message);
      assert.equal(
        test.huds.some((hud) => hud.startsWith("Input Lock failed:")),
        false,
      );
    }
  }
  const test = run();
  const command = test.command(timedDuration);
  await tick();
  test.child.stdout.emit(
    "data",
    '{"phase":"error","message":"permission denied"}\n',
  );
  test.child.emit("close", 1, null);
  await command;
  assert.deepEqual(test.huds, [
    "Preparing Input Lock…",
    "Input Lock failed: permission denied",
  ]);
}

async function checkRepeatedAction() {
  const test = run();
  const action = (index = 0) =>
    test
      .view()
      .props.children.props.children[
        index
      ].props.actions.props.children.props.onAction();
  const command = action();
  await action(1);
  await tick();
  assert.equal(
    test.spawns.length,
    1,
    "repeat during preparation must be ignored",
  );
  await action(2);
  assert.equal(
    test.spawns.length,
    1,
    "repeat during a session must be ignored",
  );
  test.child.emit("close", 0, null);
  await command;
  const nextCommand = action(1);
  await tick();
  assert.equal(
    test.spawns.length,
    2,
    "a completed session allows another lock",
  );
  assert.deepEqual(test.spawns[1][1], ["--lock", "1800"]);
  test.child.emit("close", 0, null);
  await nextCommand;
}

(async () => {
  await checkRepeatedAction();
  await checkDurations();
  await checkInvalidDurations();
  await checkRecovery();
  const confirmed = run();
  let settled = false;
  const command = confirmed.command(timedDuration).then(() => {
    settled = true;
  });
  await tick();
  assert.equal(confirmed.spawns.length, 1, "action must start one helper");
  assert.deepEqual(confirmed.spawns[0][1], ["--lock", "600"]);
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

  let failures = 0;
  for (const [name, check] of [
    ["signal exit", checkSignalExit],
    ["trailing record on stdout end", () => checkTrailingRecord(true)],
    ["trailing record on child close", () => checkTrailingRecord(false)],
  ]) {
    try {
      await check();
    } catch (error) {
      failures++;
      console.error(`FAIL ${name}: ${error.message}`);
    }
  }
  assert.equal(failures, 0, "signal and trailing-record checks must pass");
  console.log(
    "command check passed: six direct duration actions, browsing without locking, repeated action guard, invalid duration, helper lifetime, final HUD, signals, trailing records, timeout/watchdog recovery, error guard",
  );
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
