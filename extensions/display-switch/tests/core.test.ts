import assert from "node:assert/strict";
import { test } from "node:test";
import { Display, DisplayController, parseDisplays, resolveDisplay, displayWarnings, helperTimeout } from "../src/core";
const one: Display = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Studio Display",
  enabled: true,
  builtIn: false,
  main: true,
  mirrored: false,
  width: 2560,
  height: 1440,
};
const two: Display = {
  ...one,
  id: "22222222-2222-2222-2222-222222222222",
  name: "Built-in Display",
  builtIn: true,
  main: false,
};
function fake(initial: Display[]) {
  let state = structuredClone(initial);
  const calls: string[][] = [];
  const controller = new DisplayController(async (args) => {
    calls.push(args);
    if (args[0] === "set")
      state = state.map((display) => (display.id === args[1] ? { ...display, enabled: args[2] === "on" } : display));
    if (args[0] === "enable-all") state = state.map((display) => ({ ...display, enabled: true }));
    return JSON.stringify(state);
  });
  return { controller, calls };
}
test("toggle off and back on preserves exact UUID", async () => {
  const { controller, calls } = fake([one, two]);
  assert.equal((await controller.toggle(" Studio Display "))[0].enabled, false);
  assert.equal((await controller.toggle(one.id))[0].enabled, true);
  assert.deepEqual(
    calls.filter((args) => args[0] === "set"),
    [
      ["set", one.id, "off"],
      ["set", one.id, "on"],
    ],
  );
});
test("cannot switch off last active display", async () => {
  const { controller, calls } = fake([one, { ...two, enabled: false }]);
  await assert.rejects(controller.set(one.id, false), /last active/);
  assert.ok(calls.every((args) => args[0] === "list"));
});
test("duplicate names require UUID", () => {
  assert.throws(() => resolveDisplay([one, { ...two, name: one.name }], one.name), /Several/);
  assert.equal(resolveDisplay([one, { ...two, name: one.name }], two.id).id, two.id);
});
test("disconnected target cannot mutate", async () => {
  const { controller, calls } = fake([one]);
  await assert.rejects(controller.set(two.id, false), /disconnected/);
  assert.equal(calls.length, 1);
});
test("UUIDs never become shell commands", async () => {
  const { controller, calls } = fake([one, two]);
  await assert.rejects(controller.set("$(touch /tmp/oops)", false), /Invalid/);
  assert.equal(calls.length, 0);
});
test("malformed and duplicate backend rows are rejected", () => {
  for (const value of [
    {},
    [one, one],
    [{ ...one, enabled: "true" }],
    [{ ...one, width: null }],
    [{ ...one, id: "1" }],
  ]) {
    assert.throws(() => parseDisplays(JSON.stringify(value)));
  }
});
test("mirrored display cannot be switched off", async () => {
  const { controller } = fake([{ ...one, mirrored: true }, two]);
  await assert.rejects(controller.set(one.id, false), /Unmirror/);
});
test("recovery enables disabled displays", async () => {
  const { controller } = fake([one, { ...two, enabled: false }]);
  assert.ok((await controller.enableAll()).every((display) => display.enabled));
});
test("successful exit without changed state is a failure", async () => {
  const controller = new DisplayController(async () => JSON.stringify([one, two]));
  await assert.rejects(controller.set(one.id, false), /could not be verified/);
});
test("idempotent requested state skips mutation", async () => {
  const { controller, calls } = fake([one]);
  await controller.set(one.id, true);
  assert.deepEqual(calls, [["list"]]);
});
test("refresh catches topology changes between toggle reads", async () => {
  let calls = 0;
  const controller = new DisplayController(async (args) => {
    assert.equal(args[0], "list");
    return JSON.stringify(++calls === 1 ? [one, two] : [one]);
  });
  await assert.rejects(controller.toggle(one.name), /last active/);
  assert.equal(calls, 2);
});

test("layout warning preserves confirmed enabled state for set and enable-all", async () => {
  const warning = "Display is on, but its previous layout could not be restored: Restore position failed";
  const controller = new DisplayController(async (args) =>
    JSON.stringify(args[0] === "list" ? [one, { ...two, enabled: false }] : [one, { ...two, enabled: true, warning }]),
  );
  const enabled = await controller.set(two.id, true);
  assert.equal(enabled[1].enabled, true);
  assert.equal(displayWarnings(enabled), warning);
  assert.equal((await controller.enableAll())[1].enabled, true);
  assert.throws(() => parseDisplays(JSON.stringify([{ ...one, warning: 42 }])));
});

test("recovery and lock-waiting reads allow the full 128-display confirmation budget", () => {
  assert.ok(helperTimeout("enable-all") > 128 * 4_000 + 15_000);
  assert.ok(helperTimeout("list") > 600_000);
  assert.equal(helperTimeout("set"), 15_000);
});
test("selected UUID identifies a successful toggle after its display name changes", async () => {
  const controller = new DisplayController(async (args) =>
    JSON.stringify(
      args[0] === "list"
        ? [one, { ...two, name: "Cached name", enabled: false }]
        : [one, { ...two, name: "New hardware name", enabled: true }],
    ),
  );
  const selected = resolveDisplay(await controller.list(), "Cached name");
  const result = await controller.set(selected.id, !selected.enabled);
  assert.equal(resolveDisplay(result, selected.id).name, "New hardware name");
});
