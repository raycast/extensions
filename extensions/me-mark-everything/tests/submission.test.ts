import assert from "node:assert/strict";
import test from "node:test";
import { Failure, type Session, type Submission, type Entity } from "../src/helper";
import { PENDING_KEY, SubmissionController, type Store } from "../src/helpers/submission";
const session = { libraryId: "L" } as Session;
const pending = (): Submission => ({
  session,
  command: {
    id: "cmd",
    libraryId: "L",
    edits: [{ entity: "b", base: { life: ["l"] }, values: { life: "active", note: "new" } }],
  },
});
const entity = {
  id: "b",
  kind: "bookmark",
  values: { life: "active" },
  conflicts: {},
  structural: [],
  purged: false,
} as Entity;
function fixture(overrides: Record<string, unknown> = {}) {
  let raw: string | undefined;
  const calls: string[] = [];
  const store: Store = {
    getItem: async () => raw,
    setItem: async (_, value) => {
      calls.push("persist");
      raw = value;
    },
    removeItem: async () => {
      calls.push("clear");
      raw = undefined;
    },
  };
  const api = {
    submit: async (p: Submission, timeout: number, c: any) => {
      await c.phase("checking");
      await c.beforeReplay?.();
      await c.phase("execute");
      assert.ok(raw);
      calls.push("execute");
      await c.phase("committed");
      return { state: "committed-readable", revision: "r", commandId: p.command.id };
    },
    submissionSession: async () => {
      calls.push("session");
    },
    getBookmark: async () => {
      calls.push("get");
      return entity;
    },
    status: async () => {
      throw Error("offline");
    },
    ...overrides,
  };
  const controller = new SubmissionController(store, api as any);
  return { controller, store, api, calls, raw: () => raw };
}
test("storage failure means zero writes", async () => {
  const f = fixture();
  f.store.setItem = async () => {
    throw Error("disk");
  };
  assert.equal((await f.controller.start("edit", async () => pending())).kind, "rejected");
  assert.ok(!f.calls.includes("execute"));
});
test("single in-flight guard covers preparation and storage; no-change writes nothing", async () => {
  const f = fixture();
  let release!: () => void;
  const first = f.controller.start("edit", async () => {
    await new Promise<void>((r) => (release = r));
    return pending();
  });
  await Promise.resolve();
  assert.equal((await f.controller.start("edit", async () => pending())).kind, "pending");
  while (!release) await Promise.resolve();
  release();
  await first;
  assert.equal(f.calls.filter((c) => c === "execute").length, 1);
  const count = f.calls.length;
  assert.equal((await f.controller.start("edit", async () => null)).kind, "no-change");
  assert.equal(f.calls.length, count);
});
test("unknown and IO preserve original payload across controller remount; no new prepare", async () => {
  for (const code of ["COMMIT_UNKNOWN", "IO", "INVALID_RESPONSE", "PATH", "PERMISSION", "CANCELLED"]) {
    const f = fixture({
      submit: async (_p: Submission, _t: number, c: any) => {
        await c.phase("execute");
        throw new Failure(code, code);
      },
    });
    assert.equal((await f.controller.start("edit", async () => pending())).kind, "pending");
    const original = JSON.parse(f.raw()!).command;
    const again = new SubmissionController(f.store, {
      ...f.api,
      submit: async (p: Submission, _t: number, c: any) => {
        assert.deepEqual(p.command, original);
        await c.beforeReplay?.();
        await c.phase("execute");
        await c.phase("committed");
        return {};
      },
    } as any);
    let prepared = false;
    assert.equal(
      (
        await again.start("edit", async () => {
          prepared = true;
          return pending();
        })
      ).kind,
      "pending",
    );
    assert.equal(prepared, false);
    assert.equal((await again.recover(session)).kind, "committed");
    assert.equal(f.raw(), undefined);
  }
});
test("committed read failure retries only get; sync failure remains saved", async () => {
  const f = fixture({
    getBookmark: async () => {
      throw new Failure("TIMEOUT", "get timed out");
    },
  });
  assert.equal((await f.controller.start("edit", async () => pending())).kind, "committed-read-failed");
  assert.equal(JSON.parse(f.raw()!).phase, "committed");
  const again = new SubmissionController(f.store, {
    ...f.api,
    getBookmark: async () => entity,
    submit: async () => {
      throw Error("must not execute");
    },
  } as any);
  assert.equal((await again.recover(session)).kind, "committed");
});
test("readable status keeps commit knowledge but still replays for hash verification", async () => {
  const f = fixture({
    submit: async (_p: Submission, _t: number, c: any) => {
      await c.phase("readable");
      await c.phase("execute");
      throw new Failure("IO", "cache");
    },
  });
  const result = await f.controller.start("edit", async () => pending());
  assert.equal(result.kind, "pending");
  assert.equal(JSON.parse(f.raw()!).phase, "readable");
  let replayed = false;
  const again = new SubmissionController(f.store, {
    ...f.api,
    submit: async (_p: Submission, _t: number, c: any) => {
      replayed = true;
      await c.phase("committed");
    },
  } as any);
  assert.equal((await again.recover(session)).kind, "committed");
  assert.equal(replayed, true);
});
test("recovering is already committed; library switch and status errors keep original record", async () => {
  const f = fixture({
    submit: async (_p: Submission, _t: number, c: any) => {
      await c.phase("recovering");
      throw new Failure("COMMITTED_RECOVERING", "waiting");
    },
  });
  assert.equal((await f.controller.start("edit", async () => pending())).kind, "pending");
  const raw = f.raw();
  assert.equal((await f.controller.recover({ libraryId: "other" } as Session)).kind, "pending");
  assert.equal(f.raw(), raw);
  assert.equal(JSON.parse(f.raw()!).phase, "recovering");
});
test("definite validation rejection unlocks new intent; collisions retain evidence and block replay", async () => {
  for (const code of ["INVALID", "BASE_REQUIRED", "CONFLICT", "PURGED", "ID_COLLISION", "CORRUPT"]) {
    const f = fixture({
      submit: async (_p: Submission, _t: number, c: any) => {
        await c.phase("execute");
        throw new Failure(code, code);
      },
    });
    const result = await f.controller.start("edit", async () => pending());
    if (["ID_COLLISION", "CORRUPT"].includes(code)) {
      assert.equal(result.kind, "pending");
      assert.equal(JSON.parse(f.raw()!).phase, "blocked");
    } else {
      assert.equal(result.kind, "rejected");
      assert.equal(f.raw(), undefined);
    }
  }
});
test("readback conflict, structure and deleted life are saved-with-review", async () => {
  for (const changed of [
    { conflicts: { title: [] } },
    { structural: [{ field: "position" }] },
    { values: { life: "trashed" } },
    { purged: true },
  ]) {
    const f = fixture({ getBookmark: async () => ({ ...entity, ...changed }) });
    assert.equal((await f.controller.start("edit", async () => pending())).kind, "committed-conflict");
  }
});
test("invalid persisted record blocks new work instead of silently discarding it", async () => {
  const f = fixture();
  await f.store.setItem(PENDING_KEY, "{}");
  await assert.rejects(f.controller.load());
  assert.equal((await f.controller.start("edit", async () => pending())).kind, "rejected");
  assert.equal(f.raw(), "{}");
  assert.ok(!f.calls.includes("execute"));
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
test("a late mount read cannot erase an executing durable intent", async () => {
  const started = deferred<void>(),
    finish = deferred<void>(),
    oldRead = deferred<string | undefined>();
  const f = fixture({
    submit: async (_p: Submission, _t: number, c: any) => {
      await c.phase("execute");
      started.resolve();
      await finish.promise;
      await c.phase("committed");
    },
  });
  const read = f.store.getItem;
  let first = true;
  f.store.getItem = (key) => {
    if (first) {
      first = false;
      return oldRead.promise;
    }
    return read(key);
  };
  const mounting = f.controller.load();
  const saving = f.controller.start("edit", async () => pending());
  await started.promise;
  oldRead.resolve(undefined);
  await mounting;
  try {
    assert.equal(f.controller.record?.command.id, "cmd");
  } finally {
    finish.resolve();
    await saving;
  }
});
test("a late mount read cannot resurrect an intent already acknowledged and cleared", async () => {
  const f = fixture();
  await f.store.setItem(
    PENDING_KEY,
    JSON.stringify({
      command: pending().command,
      libraryId: "L",
      entities: ["b"],
      mode: "edit",
      phase: "execute",
    }),
  );
  const original = f.raw(),
    oldRead = deferred<string | undefined>(),
    read = f.store.getItem;
  let first = true;
  f.store.getItem = (key) => {
    if (first) {
      first = false;
      return oldRead.promise;
    }
    return read(key);
  };
  const mounting = f.controller.load();
  assert.equal((await f.controller.recover(session)).kind, "committed");
  oldRead.resolve(original);
  await mounting;
  assert.equal(f.controller.record, undefined);
  assert.equal(f.raw(), undefined);
});
test("valid receipt followed by LocalStorage failure stays committed and recovery only reads", async () => {
  const f = fixture();
  const set = f.store.setItem;
  let fail = true;
  f.store.setItem = async (key, raw) => {
    if (fail && JSON.parse(raw).phase === "committed") throw Error("cannot persist acknowledgement");
    await set(key, raw);
  };
  const outcome = await f.controller.start("edit", async () => pending());
  assert.equal(outcome.kind, "committed-read-failed");
  assert.equal(f.controller.record?.phase, "committed");
  fail = false;
  await f.controller.load();
  assert.equal((await f.controller.recover(session)).kind, "committed");
  assert.equal(f.calls.filter((call) => call === "execute").length, 1);
});
