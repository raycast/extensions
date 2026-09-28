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

function run(confirmed) {
  const confirmations = [];
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
        Alert: { ActionStyle: { Cancel: "cancel" } },
        environment: { assetsPath: "/test/assets" },
        Form: Object.assign(() => {}, {
          Dropdown: Object.assign(() => {}, { Item: "item" }),
        }),
        Action: { SubmitForm: "submit" },
        ActionPanel: "actions",
        confirmAlert: async (options) => {
          confirmations.push(options);
          return confirmed;
        },
        showHUD: async (message) => {
          huds.push(message);
          if (message === "Inputs unlocked with Touch ID") await finalHUD;
        },
      };
    if (name === "react")
      return {
        useState: (initial) => {
          const index = hookIndex++;
          if (index >= state.length) state.push(initial);
          return [state[index], (value) => (state[index] = value)];
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
    confirmations,
    spawns,
    huds,
    child,
    finishHUD,
  };
}

async function checkSignalExit() {
  const test = run(true);
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
  const test = run(true);
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
  const form = run(false).view();
  assert.equal(form.props.enableDrafts, false);
  const dropdown = form.props.children;
  assert.equal(dropdown.props.value, "");
  assert.equal(dropdown.props.storeValue, false);
  assert.equal(Object.hasOwn(dropdown.props, "defaultValue"), false);
  const items = dropdown.props.children.flat();
  assert.deepEqual(
    items.map(({ props: { title, value } }) => ({ title, value })),
    [{ title: "Choose duration", value: "" }, ...choices],
  );
  for (const { title, value } of choices) {
    const test = run(true);
    const command = test.command(value);
    await tick();
    assert.equal(test.confirmations.length, 1);
    assert.equal(
      test.confirmations[0].title,
      value === "indefinite"
        ? "Lock inputs indefinitely?"
        : `Lock inputs for ${title}?`,
    );
    assert.equal(test.confirmations[0].primaryAction.title, "Lock Inputs");
    assert.equal(test.confirmations[0].dismissAction.style, "cancel");
    if (value === "indefinite") {
      assert.ok(
        test.confirmations[0].message.includes(
          "There is no automatic duration release. If the unlock gesture fails, manual recovery may be needed.",
        ),
      );
    } else {
      assert.ok(
        test.confirmations[0].message.includes(
          `Inputs unlock automatically after ${title}.`,
        ),
      );
    }
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
    const test = run(true);
    await test.command(duration);
    assert.equal(
      test.confirmations.length,
      0,
      "invalid duration must not confirm",
    );
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
      const test = run(true);
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
  const test = run(true);
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

async function checkForm() {
  const test = run(false);
  let form = test.view();
  const submit = (view) => view.props.actions.props.children.props.onSubmit();
  await submit(form);
  assert.equal(test.confirmations.length, 0);
  assert.equal(test.spawns.length, 0);
  form = test.view();
  assert.equal(form.props.children.props.error, "Choose a duration.");
  form.props.children.props.onChange("toString");
  await submit(test.view());
  assert.equal(test.confirmations.length, 0);
  test.view().props.children.props.onChange("1800");
  form = test.view();
  assert.equal(form.props.children.props.value, "1800");
  assert.equal(form.props.children.props.error, undefined);
  await submit(form);
  assert.equal(test.confirmations[0].title, "Lock inputs for 30 minutes?");
  assert.equal(test.spawns.length, 0);
  assert.equal(
    test.view().props.children.props.value,
    "",
    "cancel requires a fresh choice",
  );
  await submit(test.view());
  assert.equal(test.confirmations.length, 1);
  assert.equal(
    run(false).view().props.children.props.value,
    "",
    "new launch starts empty",
  );
}

(async () => {
  await checkForm();
  await checkDurations();
  await checkInvalidDurations();
  await checkRecovery();
  const confirmed = run(true);
  let settled = false;
  const command = confirmed.command(timedDuration).then(() => {
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
    ["--lock", "600"],
    "confirmation must lock for the selected duration",
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
  await cancelled.command(timedDuration);
  assert.equal(cancelled.confirmations[0]?.primaryAction?.title, "Lock Inputs");
  assert.equal(cancelled.spawns.length, 0, "cancel must not start a helper");
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
    "command check passed: empty non-persistent form, six durations, missing/invalid selection, cancel, helper lifetime, final HUD, signals, trailing records, timeout/watchdog recovery, error guard",
  );
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
