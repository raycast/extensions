import assert from "node:assert/strict";
import test from "node:test";
import { formatInstructionPreview } from "../src/lib/instruction-preview";
import type { PreparedInstruction } from "../src/lib/automation";
import type { RoutineStep } from "../src/lib/routines";

function preparedRoutine(steps: RoutineStep[]): PreparedInstruction {
  return {
    plan: {
      text: "run Movie Night on Living Room",
      steps: [
        {
          kind: "routine",
          deviceId: "living",
          deviceName: "Living Room",
          explicitTarget: true,
          routineId: "movie-night",
          routineName: "Movie Night",
        },
      ],
      preview: ["Living Room: run Movie Night"],
    },
    routines: [{ id: "movie-night", name: "Movie Night", deviceId: "living", steps }],
  };
}

test("routine confirmation shows every action in order, repeats, and explicit toggles", () => {
  const prepared = preparedRoutine([
    { type: "wake" },
    { type: "launch", appId: "tvinput.hdmi2", appName: "PS5" },
    { type: "key", key: "VolumeDown", count: 3 },
    { type: "key", key: "Play" },
    { type: "key", key: "VolumeMute", count: 2 },
    { type: "key", key: "PowerOff" },
    { type: "wait", seconds: 1 },
    { type: "wait", seconds: 2.5 },
    { type: "restore" },
  ]);
  const before = structuredClone(prepared);
  assert.deepEqual(formatInstructionPreview(prepared), [
    [
      "Living Room: run Movie Night",
      "  1. Turn TV On and wait for confirmed power state",
      "  2. Open PS5",
      "  3. Lower Volume × 3",
      "  4. Toggle Play/Pause",
      "  5. Toggle Mute × 2",
      "  6. Turn TV Off",
      "  7. Wait 1 second",
      "  8. Wait 2.5 seconds",
      "  9. Restore the activity captured before this routine's first app or Home switch; before such a switch, use its saved previous app or input at run time",
    ].join("\n"),
  ]);
  assert.deepEqual(prepared, before);
});

test("a full twenty-step routine is disclosed without truncating or enlarging the stored preview", () => {
  const steps: RoutineStep[] = Array.from({ length: 20 }, (_, index) => ({
    type: "launch",
    appId: String(index + 1),
    appName: `App ${String(index + 1).padStart(2, "0")} ${"x".repeat(150)}`,
  }));
  const prepared = preparedRoutine(steps);
  const blocks = formatInstructionPreview(prepared);
  assert.equal(blocks.length, 1);
  assert.ok(blocks[0].length > 2048);
  assert.equal(blocks[0].split("\n").length, 21);
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    assert.equal(step.type, "launch");
    if (step.type === "launch") assert.equal(blocks[0].split("\n")[index + 1], `  ${index + 1}. Open ${step.appName}`);
  }
  assert.deepEqual(prepared.plan.preview, ["Living Room: run Movie Night"]);
});

test("standalone restore explains its dynamic destination and preserves action and TV order", () => {
  const prepared = preparedRoutine([{ type: "restore" }]);
  prepared.plan.steps = [
    { kind: "keypress", deviceId: "kitchen", deviceName: "Kitchen", explicitTarget: true, key: "Home", count: 1 },
    { kind: "restore", deviceId: "living", deviceName: "Living Room", explicitTarget: true },
  ];
  prepared.plan.preview = ["Kitchen: go Home", "Living Room: restore the previously saved app or input"];
  assert.deepEqual(formatInstructionPreview(prepared), [
    "Kitchen: go Home",
    "Living Room: restore this TV's saved previous app or input at run time. The destination can change before execution.",
  ]);
});

test("routine disclosure falls back to the app ID when no app name was saved", () => {
  assert.equal(
    formatInstructionPreview(preparedRoutine([{ type: "launch", appId: "tvinput.hdmi2" }]))[0],
    "Living Room: run Movie Night\n  1. Open tvinput.hdmi2",
  );
});

test("missing, duplicated, renamed, or differently targeted routines cannot be displayed as the saved plan", () => {
  const prepared = preparedRoutine([{ type: "key", key: "Home" }]);
  for (const routines of [
    [],
    [prepared.routines[0], prepared.routines[0]],
    [{ ...prepared.routines[0], id: "other-id" }],
    [{ ...prepared.routines[0], name: "Different Routine" }],
    [{ ...prepared.routines[0], deviceId: "bedroom" }],
  ]) {
    assert.throws(() => formatInstructionPreview({ ...prepared, routines }), /saved routine does not match/);
  }
});
