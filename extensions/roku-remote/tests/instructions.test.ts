import assert from "node:assert/strict";
import test from "node:test";
import { parseInstruction, InstructionError, type InstructionContext } from "../src/lib/instructions";

function context(): InstructionContext {
  return {
    devices: [
      { id: "living", name: "Living Room", host: "192.168.1.10", capabilities: {} },
      { id: "kitchen", name: "Kitchen Roku", host: "192.168.1.11", capabilities: {} },
      { id: "bedroom", name: "Bedroom", host: "192.168.1.12", capabilities: {} },
    ],
    selectedDeviceId: "living",
    appsByDevice: {
      living: [
        { id: "837", name: "YouTube" },
        { id: "tvinput.hdmi2", name: "PS5" },
      ],
      kitchen: [
        { id: "837", name: "YouTube" },
        { id: "12", name: "Netflix" },
      ],
      bedroom: [{ id: "837", name: "YouTube" }],
    },
    routines: [{ id: "r1", name: "Gaming Mode", deviceId: "living" }],
    settings: {
      roomAliases: { downstairs: "living" },
      targetAliases: [{ alias: "gaming", deviceId: "living", appId: "tvinput.hdmi2" }],
      protectedDeviceIds: ["bedroom"],
    },
  };
}
function rejects(input: string, code: string, ctx = context()) {
  assert.throws(
    () => parseInstruction(input, ctx),
    (error) => error instanceof InstructionError && error.code === code,
  );
}

test("plain English selects an exact TV and installed app", () => {
  const plan = parseInstruction("Open YouTube in the kitchen", context());
  assert.deepEqual(plan.steps[0], {
    kind: "launch",
    deviceId: "kitchen",
    deviceName: "Kitchen Roku",
    explicitTarget: true,
    appId: "837",
    appName: "YouTube",
  });
  assert.match(plan.preview[0], /Kitchen Roku: open YouTube/);
});

test("switch syntax and configured room/input aliases resolve stable IDs", () => {
  const one = parseInstruction("switch Living Room to PS5", context()).steps[0];
  const two = parseInstruction("open gaming on downstairs", context()).steps[0];
  assert.equal(one.kind, "launch");
  assert.equal(two.kind, "launch");
  if (one.kind === "launch" && two.kind === "launch") assert.equal(one.appId, two.appId);
  assert.equal(two.deviceId, "living");
});

test("counts accept words and bounded integers, reject excessive or invalid steps", () => {
  const plan = parseInstruction("lower volume three steps", context());
  assert.deepEqual(plan.steps[0], {
    kind: "keypress",
    deviceId: "living",
    deviceName: "Living Room",
    explicitTarget: false,
    key: "VolumeDown",
    count: 3,
  });
  assert.match(plan.preview[0], /3 steps/);
  assert.equal(parseInstruction("raise the volume by ten steps in kitchen", context()).steps[0].kind, "keypress");
  rejects("lower volume 21 steps", "invalid-count");
  rejects("lower volume 0 steps", "invalid-count");
  rejects("raise volume banana steps", "invalid-count");
});

test("routines work by exact name or explicit run command", () => {
  const ctx = context();
  assert.equal(parseInstruction("gaming mode", ctx).steps[0].kind, "routine");
  assert.equal(parseInstruction("run gaming mode on downstairs", ctx).steps[0].deviceId, "living");
  rejects("run unknown routine", "unknown-routine");
  ctx.routines.push({ id: "r2", name: "Gaming Mode", deviceId: "kitchen" });
  rejects("gaming mode", "ambiguous-routine", ctx);
  assert.equal(parseInstruction("gaming mode in kitchen", ctx).steps[0].deviceId, "kitchen");
});

test("explicit-only TVs reject a default or implicit routine target", () => {
  const ctx = context();
  ctx.selectedDeviceId = "bedroom";
  rejects("open YouTube", "protected-device", ctx);
  rejects("restore", "protected-device", ctx);
  assert.equal(parseInstruction("open YouTube in the bedroom", ctx).steps[0].explicitTarget, true);
  ctx.routines = [{ id: "r2", name: "Night Mode", deviceId: "bedroom" }];
  rejects("run Night Mode", "protected-device", ctx);
  assert.equal(parseInstruction("run Night Mode in bedroom", ctx).steps[0].kind, "routine");
});

test("missing defaults and unknown or ambiguous room names fail without fallback", () => {
  const ctx = context();
  ctx.selectedDeviceId = undefined;
  rejects("open YouTube", "ambiguous-device", ctx);
  rejects("open YouTube in bathroom", "unknown-device", ctx);
  ctx.settings.roomAliases.kitchen = "living";
  rejects("open YouTube in kitchen", "ambiguous-device", ctx);
});

test("duplicate app names, conflicting aliases and stale app IDs are rejected", () => {
  const ctx = context();
  ctx.appsByDevice.living.push({ id: "another", name: "YouTube" });
  rejects("open YouTube", "ambiguous-app", ctx);
  ctx.settings.targetAliases.push({ alias: "gaming", deviceId: "living", appId: "837" });
  rejects("open gaming", "ambiguous-app", ctx);
  ctx.settings.targetAliases = [{ alias: "missing", deviceId: "living", appId: "deleted" }];
  rejects("open missing", "unknown-app", ctx);
  rejects("open unknown", "unknown-app", ctx);
});

test("a multi-step sentence is entirely resolved before any plan is returned", () => {
  const plan = parseInstruction("open YouTube in kitchen then lower volume two steps on Living Room", context());
  assert.deepEqual(
    plan.steps.map((step) => step.deviceId),
    ["kitchen", "living"],
  );
  rejects("open YouTube in kitchen and dance a jig", "unknown-command");
  rejects("open YouTube in kitchen then open Missing", "unknown-app");
  rejects("open YouTube in kitchen and", "unknown-command");
});

test("each unqualified clause uses the selected default, with a clear preview", () => {
  const plan = parseInstruction("open YouTube in kitchen then lower volume", context());
  assert.deepEqual(
    plan.steps.map((step) => step.deviceId),
    ["kitchen", "living"],
  );
  assert.match(plan.preview[1], /^Living Room:/);
});

test("restore plans, power syntax and toggle previews state their actual actions", () => {
  assert.equal(parseInstruction("go back to what was open", context()).steps[0].kind, "restore");
  for (const text of [
    "turn on kitchen",
    "turn kitchen on",
    "power off kitchen",
    "turn on in kitchen",
    "turn on in the kitchen",
    "turn off on kitchen",
    "power on for kitchen",
  ]) {
    assert.equal(parseInstruction(text, context()).steps[0].deviceId, "kitchen");
  }
  assert.equal(parseInstruction("turn off on Living Room", context()).steps[0].deviceId, "living");
  assert.match(parseInstruction("play/pause", context()).preview[0], /toggle play\/pause/);
  assert.match(parseInstruction("toggle mute", context()).preview[0], /toggle mute/);
});

test("URLs, long input, blank instructions and unsupported code never become actions", () => {
  rejects("open https://example.com", "unknown-command");
  rejects("", "unknown-command");
  rejects("x".repeat(2001), "unknown-command");
  rejects("home\nturn off", "unknown-command");
  rejects("delete all settings", "unknown-command");
});

test("state-specific mute and playback instructions never become blind toggles", () => {
  for (const text of ["mute", "unmute", "play", "pause", "mute in kitchen", "pause on Living Room"]) {
    rejects(text, "unsupported-state");
  }
  rejects("open YouTube in kitchen then mute", "unsupported-state");
  assert.throws(() => parseInstruction("mute", context()), /toggle mute/);
  assert.throws(() => parseInstruction("pause", context()), /play\/pause/);
  assert.equal(parseInstruction("toggle playback", context()).steps[0].kind, "keypress");
});

test("exact routine names retain internal conjunctions and prepositions", () => {
  const ctx = context();
  for (const name of ["Movie in Bed", "Music on Deck", "Family and Friends", "Dinner for Two"]) {
    ctx.routines = [{ id: "special", name, deviceId: "living" }];
    for (const input of [name, `run ${name}`, `please run ${name}.`, `${name} on downstairs`]) {
      const plan = parseInstruction(input, ctx);
      assert.equal(plan.steps.length, 1);
      const step = plan.steps[0];
      assert.equal(step.kind, "routine");
      if (step.kind === "routine") assert.equal(step.routineName, name);
    }
  }
});

test("room words inside a routine name do not bypass explicit-TV protection", () => {
  const ctx = context();
  ctx.routines = [{ id: "night", name: "Movie in Bedroom", deviceId: "bedroom" }];
  rejects("Movie in Bedroom", "protected-device", ctx);
  const step = parseInstruction("Movie in Bedroom on Bedroom", ctx).steps[0];
  assert.equal(step.deviceId, "bedroom");
  assert.equal(step.explicitTarget, true);
});

test("a routine target suffix does not swallow a following command", () => {
  const plan = parseInstruction("run gaming mode on Living Room then home in kitchen", context());
  assert.deepEqual(
    plan.steps.map((step) => [step.kind, step.deviceId]),
    [
      ["routine", "living"],
      ["keypress", "kitchen"],
    ],
  );
  rejects("run gaming mode on Living Room then mute", "unsupported-state");
});
