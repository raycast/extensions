import assert from "node:assert/strict";
import test from "node:test";
import { CommandScheduler } from "../src/lib/command-scheduler";
import { AppVerificationSession } from "../src/lib/contract";
import { IntegrationError } from "../src/lib/errors";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

test("a manual refresh waits for the background poll and runs without another click", async () => {
  const scheduler = new CommandScheduler();
  const finishPoll = deferred();
  const finishManual = deferred();
  const manualStarted = deferred();
  const events: string[] = [];
  const poll = scheduler.refresh(false, async () => {
    events.push("poll start");
    await finishPoll.promise;
    events.push("poll end");
  });
  const manual = scheduler.refresh(true, async () => {
    events.push("manual start");
    manualStarted.resolve();
    await finishManual.promise;
    events.push("manual end");
  });
  await scheduler.refresh(false, async () => {
    assert.fail("a busy background poll must be skipped");
  });
  assert.deepEqual(events, ["poll start"]);
  finishPoll.resolve();
  await manualStarted.promise;
  assert.deepEqual(events, ["poll start", "poll end", "manual start"]);
  finishManual.resolve();
  await Promise.all([poll, manual]);
  assert.equal(events.at(-1), "manual end");
});

test("repeated manual refreshes share one queued callback and all wait for its result", async () => {
  const scheduler = new CommandScheduler();
  const finishPoll = deferred();
  const finishManual = deferred();
  const manualStarted = deferred();
  let callbacks = 0;
  let completed = 0;
  const poll = scheduler.refresh(false, () => finishPoll.promise);
  const manual = scheduler.refresh(true, async () => {
    callbacks += 1;
    manualStarted.resolve();
    await finishManual.promise;
  });
  const duplicate = scheduler.refresh(true, async () => {
    assert.fail("a duplicate must not replace the first queued callback");
  });
  const waiting = [manual, duplicate].map((promise) =>
    promise.then(() => {
      completed += 1;
    }),
  );
  finishPoll.resolve();
  await manualStarted.promise;
  assert.equal(callbacks, 1);
  assert.equal(completed, 0);
  await scheduler.refresh(false, async () => {
    assert.fail("a poll must not overlap an explicit refresh");
  });
  finishManual.resolve();
  await Promise.all([poll, ...waiting]);
  assert.equal(completed, 2);
});

for (const order of [
  ["action", "refresh"],
  ["refresh", "action"],
] as const) {
  test(`queued ${order.join(" then ")} operations preserve FIFO without overlap`, async () => {
    const scheduler = new CommandScheduler();
    const finishPoll = deferred();
    const finishFirst = deferred();
    const firstStarted = deferred();
    const events: string[] = [];
    const poll = scheduler.refresh(false, () => finishPoll.promise);
    const requests = order.map((kind, index) => {
      const operation = async () => {
        events.push(`${kind} start`);
        if (index === 0) {
          firstStarted.resolve();
          await finishFirst.promise;
        }
        events.push(`${kind} end`);
      };
      return kind === "action"
        ? scheduler.action(operation)
        : scheduler.refresh(true, operation);
    });
    finishPoll.resolve();
    await firstStarted.promise;
    assert.deepEqual(events, [`${order[0]} start`]);
    finishFirst.resolve();
    await Promise.all([poll, ...requests]);
    assert.deepEqual(events, [
      `${order[0]} start`,
      `${order[0]} end`,
      `${order[1]} start`,
      `${order[1]} end`,
    ]);
  });
}

test("coalescing keeps the queued refresh ahead of a later action", async () => {
  const scheduler = new CommandScheduler();
  const finishPoll = deferred();
  const events: string[] = [];
  const poll = scheduler.refresh(false, () => finishPoll.promise);
  const first = scheduler.refresh(true, async () => {
    events.push("refresh");
  });
  const action = scheduler.action(async () => {
    events.push("action");
  });
  const duplicate = scheduler.refresh(true, async () => {
    assert.fail("later manual requests share the first queued refresh");
  });
  finishPoll.resolve();
  await Promise.all([poll, first, action, duplicate]);
  assert.deepEqual(events, ["refresh", "action"]);
});

test("an active manual refresh can have one additional manual refresh queued behind it", async () => {
  const scheduler = new CommandScheduler();
  const finishFirst = deferred();
  let count = 0;
  const first = scheduler.refresh(true, async () => {
    count += 1;
    await finishFirst.promise;
  });
  const second = scheduler.refresh(true, async () => {
    count += 1;
  });
  const third = scheduler.refresh(true, async () => {
    assert.fail("only one follow-up refresh should run");
  });
  assert.equal(count, 1);
  finishFirst.resolve();
  await Promise.all([first, second, third]);
  assert.equal(count, 2);
});

test("failed operations reject their callers but drain the following queue", async () => {
  const scheduler = new CommandScheduler();
  const finishPoll = deferred();
  const pollFailure = new Error("poll failed");
  const refreshFailure = new Error("refresh failed");
  const poll = scheduler.refresh(false, async () => {
    await finishPoll.promise;
    throw pollFailure;
  });
  const refresh = scheduler.refresh(true, async () => {
    throw refreshFailure;
  });
  const duplicate = scheduler.refresh(true, async () => {
    assert.fail("the failing queued refresh must remain coalesced");
  });
  let actionRan = false;
  const action = scheduler.action(async () => {
    actionRan = true;
  });
  const failures = [
    assert.rejects(poll, pollFailure),
    assert.rejects(refresh, refreshFailure),
    assert.rejects(duplicate, refreshFailure),
  ];
  finishPoll.resolve();
  await Promise.all([...failures, action]);
  assert.equal(actionRan, true);
});

test("dispose rejects every queued caller without running callbacks or cancelling the active operation", async () => {
  const scheduler = new CommandScheduler();
  const finishPoll = deferred();
  let activeCompleted = false;
  const poll = scheduler.refresh(false, async () => {
    await finishPoll.promise;
    activeCompleted = true;
  });
  const forbidden = async () => {
    assert.fail("disposed queue callbacks must never execute");
  };
  const queued = [
    scheduler.refresh(true, forbidden),
    scheduler.refresh(true, forbidden),
    scheduler.action(forbidden),
  ];
  const cancelled = queued.map((promise) =>
    assert.rejects(promise, { code: "cancelled" }),
  );
  scheduler.dispose();
  scheduler.dispose();
  await Promise.all(cancelled);
  assert.equal(activeCompleted, false);
  await assert.rejects(scheduler.refresh(false, forbidden), {
    code: "cancelled",
  });
  await assert.rejects(scheduler.refresh(true, forbidden), {
    code: "cancelled",
  });
  await assert.rejects(scheduler.action(forbidden), { code: "cancelled" });
  finishPoll.resolve();
  await poll;
  assert.equal(activeCompleted, true);
});

for (const first of ["action", "refresh"] as const) {
  test(`${first} and subsequent verification do not invalidate each other`, async () => {
    const scheduler = new CommandScheduler();
    const session = new AppVerificationSession();
    const finishFirst = deferred();
    let verifications = 0;
    const operation = async () => {
      await session.verify(async () => {
        verifications += 1;
        await finishFirst.promise;
      });
      assert.equal(session.canPoll(), true);
    };
    const initial =
      first === "action"
        ? scheduler.action(operation)
        : scheduler.refresh(true, operation);
    const generation = session.generation;
    const nextOperation = async () => {
      await session.verify(async () => {
        verifications += 1;
      });
    };
    const next =
      first === "action"
        ? scheduler.refresh(true, nextOperation)
        : scheduler.action(nextOperation);
    assert.equal(verifications, 1);
    assert.equal(session.generation, generation);
    finishFirst.resolve();
    await Promise.all([initial, next]);
    assert.equal(verifications, 2);
    assert.equal(session.canPoll(), true);
  });
}

test("external invalidation still rejects an active verification and failed follow-up remains fail-closed", async () => {
  const scheduler = new CommandScheduler();
  const session = new AppVerificationSession();
  const finishVerification = deferred();
  let published = false;
  const action = scheduler.action(async () => {
    await session.verify(() => finishVerification.promise);
    published = true;
  });
  const generation = session.generation;
  const signatureFailure = new IntegrationError("appSignatureInvalid");
  const refresh = scheduler.refresh(true, async () => {
    await session.verify(async () => {
      throw signatureFailure;
    });
  });
  const rejected = [
    assert.rejects(action, { code: "cancelled" }),
    assert.rejects(refresh, signatureFailure),
  ];
  session.invalidate();
  finishVerification.resolve();
  await Promise.all(rejected);
  assert.equal(published, false);
  assert.equal(session.canPoll(), false);
  assert.equal(session.accepts(generation), false);
});
