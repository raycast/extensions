import assert from "node:assert/strict";
import test from "node:test";
import { createActivityController, createRoutineActivityController, type ActivityAdapter } from "../src/lib/activity";
import type { RokuApp } from "../src/lib/types";

function fixture(initial: RokuApp | undefined, saved?: RokuApp, overrides: Partial<ActivityAdapter> = {}) {
  let active = initial;
  let previous: RokuApp | undefined = saved;
  const calls: string[] = [];
  const historyCalls: string[] = [];
  const controller = createActivityController({
    active: async () => active,
    launch: async (id) => {
      calls.push(`launch:${id}`);
      active = { id, name: id };
    },
    home: async () => {
      calls.push("Home");
      active = { id: "system-menu", name: "Home", type: "home" };
    },
    remember: async (app) => {
      historyCalls.push(`remember:${app.id}`);
      previous = app;
    },
    clearPrevious: async () => {
      historyCalls.push("clear");
      previous = undefined;
    },
    previous: async () => previous,
    wait: async () => undefined,
    ...overrides,
  });
  return { controller, calls, historyCalls, previous: () => previous };
}

function routineFor(controller: ReturnType<typeof createActivityController>) {
  return createRoutineActivityController({
    launch: (id, remember) => controller.launch(id, id, remember),
    home: (remember) => controller.home(remember),
    restore: () => controller.restore(),
    restoreKnown: (app) => controller.restoreKnown(app),
  });
}

test("restores original input without overwriting it or toggling on repeated restore", async () => {
  const f = fixture({ id: "tvinput.hdmi2", name: "Console" });
  assert.equal((await f.controller.launch("12", "Movie app")).confirmed, true);
  assert.equal(f.previous()?.id, "tvinput.hdmi2");
  await f.controller.restore();
  await f.controller.restore();
  assert.deepEqual(f.calls, ["launch:12", "launch:tvinput.hdmi2"]);
});

test("restoring Roku Home uses its key rather than launching a system app ID", async () => {
  const f = fixture({ id: "562859", name: "Roku Dynamic Menu", type: "home" });
  await f.controller.launch("12");
  await f.controller.restore();
  assert.deepEqual(f.calls, ["launch:12", "Home"]);
});

test("routine steps can retain the activity from before the first switch", async () => {
  const f = fixture({ id: "tvinput.hdmi2", name: "Console" });
  await f.controller.home();
  await f.controller.launch("12", "Movie app", false);
  await f.controller.restore();
  assert.equal(f.previous()?.id, "tvinput.hdmi2");
  assert.deepEqual(f.calls, ["Home", "launch:12", "launch:tvinput.hdmi2"]);
});

test("an already-active first target does not suppress remembering the later actual switch", async () => {
  const f = fixture({ id: "12", name: "Original app" });
  const routine = routineFor(f.controller);
  const first = await routine.launch("12");
  assert.equal(first.changed, false);
  assert.equal(f.previous(), undefined);
  const second = await routine.launch("13");
  assert.equal(second.changed, true);
  assert.equal(f.previous()?.id, "12");
  await routine.launch("14");
  await routine.restore();
  assert.deepEqual(f.calls, ["launch:13", "launch:14", "launch:12"]);
});

test("absent previous activity fails without issuing a command", async () => {
  const f = fixture({ id: "12", name: "App" });
  await assert.rejects(f.controller.restore(), /No previous/);
  assert.deepEqual(f.calls, []);
});

test("accepted launch without matching readback is honestly unconfirmed", async () => {
  const controller = createActivityController({
    active: async () => ({ id: "12", name: "Old app" }),
    launch: async () => undefined,
    home: async () => undefined,
    previous: async () => undefined,
    remember: async () => undefined,
    clearPrevious: async () => undefined,
    wait: async () => undefined,
  });
  const result = await controller.launch("13");
  assert.equal(result.confirmed, false);
  assert.equal(result.changed, true);
});

test("history is persisted before a switch command is issued", async () => {
  const events: string[] = [];
  const f = fixture({ id: "12", name: "Old app" }, undefined, {
    remember: async () => {
      events.push("remember");
    },
    launch: async () => {
      assert.deepEqual(events, ["remember"]);
      events.push("launch");
    },
  });
  await f.controller.launch("13");
  assert.deepEqual(events, ["remember", "launch"]);
});

test("a failed history save stops both launch and Home before changing the TV", async () => {
  for (const action of ["launch", "home"] as const) {
    const f = fixture({ id: "12", name: "Old app" }, undefined, {
      remember: async () => {
        throw new Error("Storage full");
      },
    });
    await assert.rejects(action === "launch" ? f.controller.launch("13") : f.controller.home(), /Storage full/);
    assert.deepEqual(f.calls, []);
  }
});

test("unknown current activity clears a stale restore target before switching", async () => {
  const f = fixture(undefined, { id: "stale", name: "Old saved app" });
  await f.controller.launch("13");
  assert.deepEqual(f.historyCalls, ["clear"]);
  assert.equal(f.previous(), undefined);
  await assert.rejects(f.controller.restore(), /No previous/);
  assert.deepEqual(f.calls, ["launch:13"]);
});

test("a failed stale-history clear stops the switch command", async () => {
  const f = fixture(
    undefined,
    { id: "stale", name: "Old saved app" },
    {
      clearPrevious: async () => {
        throw new Error("Storage unavailable");
      },
    },
  );
  await assert.rejects(f.controller.launch("13"), /Storage unavailable/);
  assert.deepEqual(f.calls, []);
});

test("an already-active target preserves existing history without writing storage", async () => {
  const original = { id: "tvinput.hdmi1", name: "Console" };
  const f = fixture({ id: "12", name: "App" }, original, {
    remember: async () => {
      throw new Error("Unexpected write");
    },
  });
  assert.equal((await f.controller.launch("12")).changed, false);
  assert.deepEqual(f.previous(), original);
  assert.deepEqual(f.calls, []);
});

test("later routine steps preserve the original history even when current activity is unknown", async () => {
  const original = { id: "tvinput.hdmi1", name: "Console" };
  const f = fixture(undefined, original);
  await f.controller.launch("13", "App", false);
  assert.deepEqual(f.historyCalls, []);
  assert.deepEqual(f.previous(), original);
  await f.controller.restore();
  assert.deepEqual(f.calls, ["launch:13", "launch:tvinput.hdmi1"]);
  assert.deepEqual(f.previous(), original);
});

test("a failed switch retains the immediately preceding activity instead of restoring stale history", async () => {
  const original = { id: "12", name: "Original app" };
  const f = fixture(
    original,
    { id: "stale", name: "Stale app" },
    {
      launch: async () => {
        throw new Error("Request failed before acceptance was confirmed");
      },
    },
  );
  await assert.rejects(f.controller.launch("13"), /Request failed/);
  assert.deepEqual(f.previous(), original);
  assert.equal((await f.controller.restore()).changed, false);
  assert.deepEqual(f.historyCalls, ["remember:12"]);
});

test("a routine restores its own origin after another control changes shared history", async () => {
  const original = { id: "tvinput.hdmi1", name: "Console" };
  const f = fixture(original);
  const routine = routineFor(f.controller);
  assert.deepEqual((await routine.launch("12")).previousApp, original);

  // An unrelated command during a routine's wait replaces the shared history.
  await f.controller.launch("13");
  assert.equal(f.previous()?.id, "12");
  await routine.home();
  await routine.restore();
  assert.equal((await routine.restore()).changed, false);
  assert.deepEqual(f.calls, ["launch:12", "launch:13", "Home", "launch:tvinput.hdmi1"]);
  assert.equal(f.previous()?.id, "12");
});

test("a routine with an unknown origin does not restore history later written by another control", async () => {
  const f = fixture(undefined, { id: "stale", name: "Old saved app" });
  const routine = routineFor(f.controller);
  await routine.launch("12");
  await f.controller.launch("13");
  assert.equal(f.previous()?.id, "12");
  await assert.rejects(routine.restore(), /cannot safely restore/);
  assert.deepEqual(f.calls, ["launch:12", "launch:13"]);
});

test("a routine restore before its first switch uses existing history and handles Home correctly", async () => {
  const f = fixture({ id: "12", name: "App" }, { id: "562859", name: "Home", type: "home" });
  const routine = routineFor(f.controller);
  await routine.restore();
  await routine.launch("13");
  await f.controller.launch("14");
  await routine.restore();
  assert.deepEqual(f.calls, ["Home", "launch:13", "launch:14", "Home"]);
});
