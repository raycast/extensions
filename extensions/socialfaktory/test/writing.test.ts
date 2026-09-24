import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  McpHttpError,
  McpNetworkError,
  McpRpcError,
  McpToolError,
  UNREACHABLE,
  type CallOptions,
} from "../src/lib/mcp.ts";
import { CONNECTION_RENEWED, CONNECTION_RENEWED_TOOL, ConnectionRenewedError } from "../src/lib/session.ts";
import { abortableSleep } from "../src/lib/time.ts";
import type { TextGeneration } from "../src/lib/types.ts";
import {
  MAX_PENDING_WRITES,
  PENDING_WRITE_PREFIX,
  PENDING_WRITE_TTL_MS,
  POLL_INTERVAL_MS,
  MAX_BACKOFF_MS,
  FAILED_WRITE_NOTE,
  UNKNOWN_OUTCOME_NOTE,
  UNREACHABLE_CHECK_AGAIN,
  WRITE_TIMEOUT_MS,
  GENERATE_TIMEOUT_MS,
  NO_POST_SINCE_SIGN_IN,
  NO_RECENT_POST,
  UNREACHABLE_ADVICE,
  UNREACHABLE_TITLE,
  confirmationFor,
  failureTitle,
  findSameWrite,
  lastWriteOrMessage,
  loadWrite,
  mayStillBeRunning,
  pollWrite,
  retryRequest,
  startWrite,
  validateToolInput,
  writeForTool,
  type WriteDependencies,
  type WriteRecord,
  type WriteTarget,
} from "../src/lib/writing.ts";

const target: WriteTarget = { brandId: "brand_7Kp2", textGenerationId: "wgen_4Tz8", platform: "linkedin" };

function generation(status: TextGeneration["status"], variants: TextGeneration["variants"] = []): TextGeneration {
  return { id: "wgen_4Tz8", status, platform: "linkedin", mode: "variants", variants };
}

const written = generation("succeeded", [{ status: "succeeded", parts: ["Our oat milk latte is here."] }]);

type Held = { fingerprint: string; answer: { id: string } | { refusal: McpToolError } };

class FakeServer {
  balance: number;
  spent = 0;
  keysSeen: string[] = [];
  fail: Error[] = [];
  loseNextAnswer = false;
  failGenerations = false;
  generations = new Map<string, TextGeneration>();
  keys = new Map<string, Held>();

  constructor(balance: number) {
    this.balance = balance;
  }

  call = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
    if (name === "get_text_generation") {
      const found = this.generations.get(String(args.text_generation_id));
      if (!found) throw new McpToolError("not_found", {});
      return found as T;
    }
    const { idempotency_key: key, ...rest } = args;
    this.keysSeen.push(String(key));
    const failure = this.fail.shift();
    if (failure instanceof McpToolError && failure.kind !== "idempotency_in_progress") {
      this.keys.set(String(key), { fingerprint: JSON.stringify(rest), answer: { refusal: failure } });
      throw failure;
    }
    if (failure) throw failure;
    const fingerprint = JSON.stringify(rest);
    let held = this.keys.get(String(key));
    if (held && held.fingerprint !== fingerprint) throw new McpToolError("idempotency_key_reuse", {});
    if (!held) {
      if (this.balance < 3) {
        held = {
          fingerprint,
          answer: { refusal: new McpToolError("insufficient_tokens", { balance: this.balance, required: 3 }) },
        };
      } else {
        this.balance -= 3;
        this.spent += 3;
        const id = `wgen_${this.generations.size + 1}`;
        this.generations.set(id, {
          id,
          status: this.failGenerations ? "failed" : "succeeded",
          platform: rest.platform as "x" | "linkedin",
          mode: "variants",
          variants: this.failGenerations
            ? [{ status: "failed", reason: "writer error" }]
            : [{ status: "succeeded", parts: [`Post about ${rest.brief}`] }],
        });
        held = { fingerprint, answer: { id } };
      }
      this.keys.set(String(key), held);
    }
    if (this.loseNextAnswer) {
      this.loseNextAnswer = false;
      throw new McpNetworkError("SocialFaktory took too long to answer.");
    }
    if ("refusal" in held.answer) throw held.answer.refusal;
    return { text_generation_id: held.answer.id, status: "pending" } as T;
  };
}

function memory() {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: async (key: string) => values.get(key),
      setItem: async (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: async (key: string) => {
        values.delete(key);
      },
      allItems: async () => Object.fromEntries(values),
    },
  };
}

type Setup = {
  account?: () => string;
  clock?: { now: number };
  store?: ReturnType<typeof memory>;
  signIn?: () => Promise<void>;
  onSleep?: () => void;
  sent?: Map<string, string>;
};

function dependencies(call: WriteDependencies["call"], setup: Setup = {}) {
  const clock = setup.clock ?? { now: 1_700_000_000_000 };
  const store = setup.store ?? memory();
  const sleeps: number[] = [];
  const deps: WriteDependencies = {
    call,
    now: () => clock.now,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock.now += ms;
      setup.onSleep?.();
    },
    random: () => 0.5,
    storage: store.storage,
    signIn: setup.signIn ?? (async () => {}),
    account: async () => (setup.account ? setup.account() : "oauth:account-1"),
    sent: setup.sent ?? new Map(),
  };
  return { deps, store, sleeps, clock };
}

type Answer = TextGeneration | Error | ((clock: number) => TextGeneration | Error);

function scripted(answers: Answer[]) {
  const calls: { name: string; args: Record<string, unknown>; options?: CallOptions; at: number }[] = [];
  const clock = { now: 0 };
  const call = async <T>(name: string, args: Record<string, unknown>, options?: CallOptions) => {
    calls.push({ name, args, options, at: clock.now });
    const next = answers.length > 1 ? answers.shift() : answers[0];
    const answer = typeof next === "function" ? next(clock.now) : next;
    if (answer instanceof Error) throw answer;
    return answer as T;
  };
  const built = dependencies(call, { clock });
  return { ...built, calls };
}

function entries(store: ReturnType<typeof memory>): WriteRecord[] {
  return [...store.values.entries()]
    .filter(([key]) => key.startsWith(PENDING_WRITE_PREFIX))
    .map(([, value]) => JSON.parse(value) as WriteRecord);
}

const brief = { brandId: "brand_7Kp2", brief: "Boundary brief", platform: "x" as const };

describe("startWrite", () => {
  it("saves the pending write before asking, then adds the generation id", async () => {
    let savedBeforeCall: WriteRecord[] = [];
    const server = new FakeServer(10);
    const { deps, store } = dependencies(async (name, args, options) => {
      savedBeforeCall = entries(store);
      assert.equal(options?.timeoutMs, GENERATE_TIMEOUT_MS);
      return server.call(name, args);
    });

    const started = await startWrite(deps, { ...brief, idempotencyKey: "key-1" });

    assert.equal(savedBeforeCall.length, 1);
    assert.equal(savedBeforeCall[0].key, "key-1");
    assert.equal(savedBeforeCall[0].textGenerationId, undefined);
    assert.equal(started.textGenerationId, "wgen_1");
    assert.deepEqual(
      entries(store).map((entry) => entry.textGenerationId),
      ["wgen_1"],
    );
  });

  it("reuses the key of a live unsettled write of the same brief", async () => {
    const server = new FakeServer(10);
    server.loseNextAnswer = true;
    const { deps } = dependencies(server.call);

    await startWrite(deps, { ...brief, idempotencyKey: "key-1" }).catch(() => undefined);
    const started = await startWrite(deps, { ...brief, idempotencyKey: "key-2" });

    assert.deepEqual(server.keysSeen, ["key-1", "key-1"]);
    assert.equal(started.textGenerationId, "wgen_1");
    assert.equal(server.spent, 3);
  });

  it("keeps the entry on outcomes that may still be running", async () => {
    const abort = Object.assign(new Error("This operation was aborted"), { name: "AbortError" });
    for (const failure of [
      new McpNetworkError("SocialFaktory took too long to answer."),
      new McpHttpError(503, "SocialFaktory is having trouble (503)."),
      new McpHttpError(429, "Too many requests.", 60),
      abort,
    ]) {
      const server = new FakeServer(10);
      server.fail = [failure];
      const { deps, store } = dependencies(server.call);

      await assert.rejects(startWrite(deps, { ...brief, idempotencyKey: "key-1" }), failure);
      await startWrite(deps, { ...brief, idempotencyKey: "key-2" });

      assert.deepEqual(server.keysSeen, ["key-1", "key-1"], failure.name);
      assert.equal(entries(store).length, 1);
    }
  });

  it("keeps the entry when the server is still running the request after every retry", async () => {
    const server = new FakeServer(10);
    server.fail = Array.from({ length: 6 }, () => new McpToolError("idempotency_in_progress", {}));
    const { deps, store } = dependencies(server.call);

    await assert.rejects(
      startWrite(deps, { ...brief, idempotencyKey: "key-1" }),
      (error: unknown) => error instanceof McpToolError && error.kind === "idempotency_in_progress",
    );
    await startWrite(deps, { ...brief, idempotencyKey: "key-2" });

    assert.ok(server.keysSeen.every((key) => key === "key-1"));
    assert.equal(entries(store).length, 1);
  });

  it("clears the entry on any settled failure so the next attempt gets a fresh key", async () => {
    for (const failure of [
      new McpToolError("insufficient_tokens", { balance: 1, required: 3 }),
      new McpToolError("credit_cap_exceeded", { cap: 100, spent: 100 }),
      new McpToolError("subscription_required", {}),
      new McpToolError("brand_not_allowed", {}),
      new McpToolError("validation_failed", { code: "source_required" }),
      new McpToolError("tool_failed", {}),
      new McpRpcError(-32602, "Invalid params"),
    ]) {
      const server = new FakeServer(10);
      server.fail = [failure];
      const { deps, store } = dependencies(server.call);

      await assert.rejects(startWrite(deps, { ...brief, idempotencyKey: "key-1" }), failure);
      assert.equal(entries(store).length, 0, failure.message);
      await startWrite(deps, { ...brief, idempotencyKey: "key-2" });

      assert.deepEqual(server.keysSeen, ["key-1", "key-2"], failure.message);
      assert.equal(server.spent, 3);
    }
  });

  it("never lets a different brief replace another entry", async () => {
    const server = new FakeServer(10);
    server.loseNextAnswer = true;
    const { deps, store } = dependencies(server.call);

    await startWrite(deps, { ...brief, idempotencyKey: "tool-key" }).catch(() => undefined);
    await startWrite(deps, { ...brief, brief: "Unrelated view brief", idempotencyKey: "view-key" });

    assert.deepEqual(
      entries(store)
        .map((entry) => entry.key)
        .sort(),
      ["tool-key", "view-key"],
    );
  });

  it("caps settled entries at ten and never evicts an unsettled one inside its lifetime", async () => {
    const server = new FakeServer(1000);
    const { deps, store, clock } = dependencies(server.call);
    for (let index = 0; index < MAX_PENDING_WRITES + 2; index += 1) {
      server.loseNextAnswer = true;
      clock.now += 1_000;
      await startWrite(deps, { ...brief, brief: `Unsettled ${index}`, idempotencyKey: `unsettled-${index}` }).catch(
        () => undefined,
      );
    }
    for (let index = 0; index < MAX_PENDING_WRITES + 2; index += 1) {
      clock.now += 1_000;
      const started = await startWrite(deps, {
        ...brief,
        brief: `Settled ${index}`,
        idempotencyKey: `settled-${index}`,
      });
      await pollWrite(deps, { brandId: started.brandId, textGenerationId: started.textGenerationId });
    }

    const kept = entries(store);
    assert.equal(kept.filter((entry) => !entry.textGenerationId).length, MAX_PENDING_WRITES + 2);
    assert.equal(kept.filter((entry) => entry.finished).length, MAX_PENDING_WRITES);
    assert.ok(!kept.some((entry) => entry.key === "settled-0"));
    assert.ok(kept.some((entry) => entry.key === `settled-${MAX_PENDING_WRITES + 1}`));
  });

  it("never evicts a write that has an id but is still running, however many writes finish after it", async () => {
    const server = new FakeServer(1000);
    const { deps, store, clock } = dependencies(server.call);
    const running = await startWrite(deps, { ...brief, brief: "Slow view brief", idempotencyKey: "running" });
    for (let index = 0; index < MAX_PENDING_WRITES + 2; index += 1) {
      clock.now += 1_000;
      const started = await startWrite(deps, { ...brief, brief: `Quick ${index}`, idempotencyKey: `quick-${index}` });
      await pollWrite(deps, { brandId: started.brandId, textGenerationId: started.textGenerationId });
    }

    const kept = entries(store);
    assert.ok(kept.some((entry) => entry.key === "running" && entry.textGenerationId === running.textGenerationId));
    assert.equal((await loadWrite(deps))?.key, `quick-${MAX_PENDING_WRITES + 1}`);
  });

  it("does not let a check on an expired write evict live finished writes", async () => {
    const server = new FakeServer(1000);
    const { deps, store, clock } = dependencies(server.call);
    const slow = await startWrite(deps, { ...brief, brief: "Slow brief", idempotencyKey: "slow" });
    for (let index = 0; index < MAX_PENDING_WRITES; index += 1) {
      clock.now += 1_000;
      const started = await startWrite(deps, { ...brief, brief: `Quick ${index}`, idempotencyKey: `quick-${index}` });
      await pollWrite(deps, { brandId: started.brandId, textGenerationId: started.textGenerationId });
    }
    const [slot, value] = [...store.values.entries()].find(([, stored]) => stored.includes('"key":"slow"')) ?? [];
    assert.ok(slot && value);
    store.values.set(
      slot,
      JSON.stringify({ ...JSON.parse(value), startedAt: clock.now - PENDING_WRITE_TTL_MS - 60_000 }),
    );

    await pollWrite(deps, { brandId: slow.brandId, textGenerationId: slow.textGenerationId });

    const quick = entries(store).filter((entry) => entry.key.startsWith("quick-"));
    assert.equal(quick.length, MAX_PENDING_WRITES);
    assert.ok(quick.every((entry) => entry.finished));
  });

  it("adopts the key another process saved for the same brief before asking", async () => {
    const server = new FakeServer(10);
    const store = memory();
    let sleeps = 0;
    const { deps } = dependencies(server.call, {
      store,
      onSleep: () => {
        sleeps += 1;
        if (sleeps !== 1) return;
        const [slot, value] = [...store.values.entries()].find(([key]) => key.startsWith(PENDING_WRITE_PREFIX)) ?? [];
        if (slot && value) store.values.set(slot, JSON.stringify({ ...JSON.parse(value), key: "other-process-key" }));
      },
    });

    await startWrite(deps, { ...brief, idempotencyKey: "my-key" });

    assert.deepEqual(server.keysSeen, ["other-process-key"]);
  });

  it("waits while the server is still running the same request, then takes its answer", async () => {
    let calls = 0;
    const { deps } = dependencies(async <T>() => {
      calls += 1;
      if (calls === 1) throw new McpToolError("idempotency_in_progress", {});
      return { text_generation_id: "wgen_1", status: "pending" } as T;
    });

    const started = await startWrite(deps, { ...brief, idempotencyKey: "key-1" });

    assert.equal(started.textGenerationId, "wgen_1");
    assert.equal(calls, 2);
  });

  it("reserves once when two processes start the same brief at the same moment", async () => {
    let doubles = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      if ((await sameBriefRace(seed)) > 1) doubles += 1;
    }
    assert.equal(doubles, 0);
  });

  it("takes a finished write of the same brief instead of starting a second one", async () => {
    const server = new FakeServer(50);
    const { deps } = dependencies(server.call);
    const first = await startWrite(deps, { ...brief, idempotencyKey: "tool-key" });

    const again = await startWrite(deps, { ...brief, idempotencyKey: "view-key" });

    assert.equal(again.textGenerationId, first.textGenerationId);
    assert.deepEqual(server.keysSeen, ["tool-key"]);
    assert.equal(server.spent, 3);
  });

  it("lets Try Again after an in-progress answer land on the write that finished meanwhile", async () => {
    const server = new FakeServer(50);
    const store = memory();
    const { deps } = dependencies(server.call, { store });
    server.fail = Array.from({ length: 6 }, () => new McpToolError("idempotency_in_progress", {}));
    const view = { ...brief, idempotencyKey: "view-key" };
    await assert.rejects(startWrite(deps, view));
    server.fail = [];
    await startWrite(deps, { ...brief, idempotencyKey: "tool-key" });

    const retried = await startWrite(deps, retryRequest(view, new McpToolError("idempotency_in_progress", {})));

    assert.equal(retried.textGenerationId, "wgen_1");
    assert.equal(server.spent, 3);
  });

  it("never sends a key that may have reached the server on an earlier connection", async () => {
    const server = new FakeServer(50);
    let account = "oauth:account-1";
    server.loseNextAnswer = true;
    const { deps } = dependencies(server.call, { account: () => account });
    const view = { ...brief, idempotencyKey: "view-key" };

    const lost = await startWrite(deps, view).catch((error: unknown) => error);
    account = "oauth:account-2";
    const renewed = await startWrite(deps, retryRequest(view, lost)).catch((error: unknown) => error);

    assert.ok(renewed instanceof ConnectionRenewedError);
    assert.match(CONNECTION_RENEWED, /Try Again starts a new write that reserves 3 credits/);
    assert.deepEqual(server.keysSeen, ["view-key"]);
    const fresh = retryRequest(view, renewed);
    assert.notEqual(fresh.idempotencyKey, "view-key");
    await startWrite(deps, fresh);
    assert.equal(server.keysSeen.length, 2);
  });

  it("treats a key this process already sent as not fresh, even after its entry expired", async () => {
    const seen: (CallOptions | undefined)[] = [];
    const server = new FakeServer(50);
    server.fail = [new McpNetworkError("SocialFaktory took too long to answer.", true)];
    const { deps, clock } = dependencies(async (name, args, options) => {
      seen.push(options);
      return server.call(name, args);
    });
    const view = { ...brief, idempotencyKey: "view-key" };

    await assert.rejects(startWrite(deps, view));
    clock.now += PENDING_WRITE_TTL_MS + 60_000;
    await startWrite(deps, view);

    assert.deepEqual(
      seen.map((options) => options?.resendAfterSignIn),
      [true, false],
    );
  });

  it("keeps nothing and blames the connection when the handshake never reached SocialFaktory", async () => {
    const { deps, store } = dependencies(async () => {
      throw new McpNetworkError(UNREACHABLE, false, true);
    });

    await assert.rejects(startWrite(deps, { ...brief, idempotencyKey: "key-1" }), { message: UNREACHABLE });
    assert.equal(entries(store).length, 0);
    await assert.rejects(writeForTool(deps, { brandId: brief.brandId, brief: "Offline brief" }), {
      message: UNREACHABLE,
    });
    assert.equal(entries(store).length, 0);
  });

  it("lets a first attempt be resent after a new sign-in, since a 401 means nothing ran", async () => {
    let options: CallOptions | undefined;
    const server = new FakeServer(10);
    const { deps } = dependencies(async (name, args, callOptions) => {
      options = callOptions;
      return server.call(name, args);
    });

    await startWrite(deps, { ...brief, idempotencyKey: "key-1" });

    assert.equal(options?.resendAfterSignIn, true);
  });

  it("does not resend a key an earlier attempt may have used, and clears the entry", async () => {
    const seen: (CallOptions | undefined)[] = [];
    let calls = 0;
    const { deps, store } = dependencies(async (_name, _args, callOptions) => {
      seen.push(callOptions);
      calls += 1;
      if (calls === 1) throw new McpNetworkError("SocialFaktory took too long to answer.");
      throw new ConnectionRenewedError();
    });

    await assert.rejects(startWrite(deps, { ...brief, idempotencyKey: "key-1" }), McpNetworkError);
    await assert.rejects(startWrite(deps, { ...brief, idempotencyKey: "key-2" }), ConnectionRenewedError);
    assert.deepEqual(
      seen.map((options) => options?.resendAfterSignIn),
      [true, false],
    );
    assert.equal(entries(store).length, 0);
  });

  it("drops entries older than thirty minutes", async () => {
    const server = new FakeServer(10);
    const { deps, store, clock } = dependencies(server.call);
    await startWrite(deps, { ...brief, idempotencyKey: "old" });
    clock.now += PENDING_WRITE_TTL_MS;
    await startWrite(deps, { ...brief, brief: "Fresh", idempotencyKey: "fresh" });

    assert.deepEqual(
      entries(store).map((entry) => entry.key),
      ["fresh"],
    );
  });

  it("computes the account only after sign-in completes", async () => {
    const server = new FakeServer(10);
    const order: string[] = [];
    let account = "oauth:before-sign-in";
    const { deps } = dependencies(server.call, {
      signIn: async () => {
        order.push("sign-in");
        account = "oauth:after-sign-in";
      },
      account: () => {
        order.push("account");
        return account;
      },
    });

    await startWrite(deps, { ...brief, idempotencyKey: "key-1" });

    assert.deepEqual(order.slice(0, 2), ["sign-in", "account"]);
    assert.equal((await loadWrite(deps))?.account, "oauth:after-sign-in");
  });
});

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

class VirtualClock {
  now = 1_700_000_000_000;
  private timers: { at: number; order: number; resolve: () => void }[] = [];
  private order = 0;

  sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      this.timers.push({ at: this.now + ms, order: this.order++, resolve });
    });

  async run<T>(work: Promise<T>): Promise<T> {
    let settled = false;
    work.then(
      () => (settled = true),
      () => (settled = true),
    );
    for (;;) {
      await new Promise((resolve) => setImmediate(resolve));
      if (settled) return work;
      this.timers.sort((a, b) => a.at - b.at || a.order - b.order);
      const next = this.timers.shift();
      if (!next) throw new Error("the simulation stalled");
      this.now = next.at;
      next.resolve();
    }
  }
}

async function sameBriefRace(seed: number): Promise<number> {
  const random = seeded(seed);
  const clock = new VirtualClock();
  const latency = () => clock.sleep(random() * 60);
  const values = new Map<string, string>();
  const running = new Map<string, Promise<void>>();
  const answered = new Map<string, string>();
  let reservations = 0;

  const call = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
    await latency();
    const key = String(args.idempotency_key);
    if (answered.has(key)) return { text_generation_id: answered.get(key), status: "pending" } as T;
    if (running.has(key)) throw new McpToolError("idempotency_in_progress", {});
    reservations += 1;
    const work = clock.sleep(100 + random() * 300).then(() => {
      answered.set(key, `wgen_${reservations}`);
      running.delete(key);
    });
    running.set(key, work);
    await work;
    return { text_generation_id: answered.get(key), status: "pending" } as T;
  };

  const process = (): WriteDependencies => ({
    call,
    now: () => clock.now,
    sleep: (ms) => clock.sleep(ms),
    random,
    sent: new Map(),
    storage: {
      getItem: async (key) => {
        await latency();
        return values.get(key);
      },
      setItem: async (key, value) => {
        await latency();
        values.set(key, value);
      },
      removeItem: async (key) => {
        await latency();
        values.delete(key);
      },
      allItems: async () => {
        await latency();
        return Object.fromEntries(values);
      },
    },
    signIn: async () => {},
    account: async () => "oauth:account-1",
  });

  await clock.run(
    Promise.all([
      startWrite(process(), { ...brief, brief: "Race brief", idempotencyKey: "tool-key" }),
      (async () => {
        await clock.sleep(random() * 20);
        return startWrite(process(), { ...brief, brief: "Race brief", idempotencyKey: "view-key" });
      })(),
    ]),
  );
  return reservations;
}

describe("mayStillBeRunning and retryRequest", () => {
  it("keeps a key only while the write may still be running", () => {
    assert.equal(mayStillBeRunning(new McpNetworkError("down")), true);
    assert.equal(mayStillBeRunning(new McpHttpError(503, "busy")), true);
    assert.equal(mayStillBeRunning(new McpHttpError(429, "slow down", 60)), true);
    assert.equal(mayStillBeRunning(new McpToolError("idempotency_in_progress", {})), true);
    assert.equal(mayStillBeRunning(Object.assign(new Error("aborted"), { name: "AbortError" })), true);
    assert.equal(mayStillBeRunning(new McpToolError("insufficient_tokens", {})), false);
    assert.equal(mayStillBeRunning(new McpToolError("tool_failed", {})), false);
    assert.equal(mayStillBeRunning(new McpRpcError(-32602, "Invalid params")), false);
    assert.equal(mayStillBeRunning(new McpHttpError(400, "bad request")), false);
  });

  it("rotates the key of a view request only after a settled failure", () => {
    const request = { ...brief, idempotencyKey: "key-1" };

    assert.equal(retryRequest(request, new McpNetworkError("down")).idempotencyKey, "key-1");
    assert.notEqual(retryRequest(request, new McpToolError("insufficient_tokens", {})).idempotencyKey, "key-1");
  });
});

describe("loadWrite", () => {
  it("recovers a write interrupted before its answer and replays it for one charge", async () => {
    const server = new FakeServer(10);
    server.loseNextAnswer = true;
    const { deps } = dependencies(server.call);
    await startWrite(deps, { ...brief, idempotencyKey: "key-1" }).catch(() => undefined);

    const pending = await loadWrite(deps);
    assert.ok(pending && !pending.textGenerationId);
    const started = await startWrite(deps, {
      brandId: pending.brandId,
      brief: pending.brief,
      platform: pending.platform,
      idempotencyKey: pending.key,
    });

    assert.equal(started.textGenerationId, "wgen_1");
    assert.equal(server.spent, 3);
  });

  it("answers the most recent live write of this account", async () => {
    const server = new FakeServer(10);
    const store = memory();
    const clock = { now: 1_700_000_000_000 };
    const mine = dependencies(server.call, { store, clock });
    const theirs = dependencies(server.call, { store, clock, account: () => "oauth:account-2" });
    await startWrite(mine.deps, { ...brief, brief: "First", idempotencyKey: "first" });
    clock.now += 1_000;
    await startWrite(mine.deps, { ...brief, brief: "Second", idempotencyKey: "second" });
    clock.now += 1_000;
    await startWrite(theirs.deps, { ...brief, brief: "Other account", idempotencyKey: "other" });

    assert.equal((await loadWrite(mine.deps))?.key, "second");
    assert.equal((await loadWrite(theirs.deps))?.key, "other");
    clock.now += PENDING_WRITE_TTL_MS;
    assert.equal(await loadWrite(mine.deps), undefined);
  });
});

describe("writeForTool", () => {
  const input = { brandId: "brand_7Kp2", brief: "Boundary brief", platform: "x" as const };

  it("reuses the key after an unrelated view write and a former ten-minute boundary", async () => {
    const server = new FakeServer(50);
    server.fail = [new McpHttpError(503, "SocialFaktory is having trouble (503).")];
    const { deps, clock } = dependencies(server.call);

    const first = await writeForTool(deps, input);
    clock.now += 5_000;
    await startWrite(deps, { ...input, brief: "Unrelated view brief", idempotencyKey: "k-view-between" });
    clock.now += 15 * 60_000;
    const retry = await writeForTool(deps, input);

    assert.equal(first.status, "may_still_be_writing");
    assert.equal(retry.status, "succeeded");
    assert.equal(server.keysSeen[0], server.keysSeen[2]);
    assert.equal(server.spent, 6);
  });

  it("writes after a top-up when the same brief follows a refusal", async () => {
    const server = new FakeServer(1);
    const { deps } = dependencies(server.call);

    await assert.rejects(writeForTool(deps, input), { message: "Not enough credits: 1 available, 3 needed." });
    server.balance = 50;
    const again = await writeForTool(deps, input);

    assert.equal(again.status, "succeeded");
    assert.notEqual(server.keysSeen[0], server.keysSeen[1]);
    assert.equal(server.spent, 3);
  });

  it("keeps its promise: the same brief within thirty minutes does not spend again", async () => {
    const server = new FakeServer(50);
    server.loseNextAnswer = true;
    const { deps, clock } = dependencies(server.call);

    const first = await writeForTool(deps, input);
    clock.now += PENDING_WRITE_TTL_MS - 60_000;
    const retry = await writeForTool(deps, input);

    assert.match(UNKNOWN_OUTCOME_NOTE, /within 30 minutes/);
    assert.equal(PENDING_WRITE_TTL_MS, 30 * 60_000);
    assert.equal(first.status, "may_still_be_writing");
    assert.equal(retry.status, "succeeded");
    assert.equal(server.spent, 3);
  });

  it("returns the same write for the same brief within thirty minutes without asking again", async () => {
    const server = new FakeServer(50);
    const { deps, clock } = dependencies(server.call);

    await writeForTool(deps, input);
    clock.now += 20 * 60_000;
    const again = await writeForTool(deps, input);

    assert.equal(again.status, "succeeded");
    assert.equal(server.keysSeen.length, 1);
    assert.equal(server.spent, 3);
  });

  it("writes again for a different brief", async () => {
    const server = new FakeServer(50);
    const { deps } = dependencies(server.call);

    await writeForTool(deps, input);
    await writeForTool(deps, { ...input, brief: "Autumn menu" });

    assert.equal(server.spent, 6);
  });

  it("reports the platform of a write it resumes by id", async () => {
    const server = new FakeServer(50);
    const { deps } = dependencies(server.call);
    await writeForTool(deps, { ...input, platform: "linkedin" });

    const resumed = await writeForTool(deps, { brandId: "brand_7Kp2", textGenerationId: "wgen_1" });

    assert.equal(resumed.platform, "linkedin");
    assert.equal(server.spent, 3);
  });

  it("reads the platform from the server for a write it does not know", async () => {
    const server = new FakeServer(50);
    await writeForTool(dependencies(server.call).deps, { ...input, platform: "linkedin" });
    const { deps } = dependencies(server.call);

    const resumed = await writeForTool(deps, { brandId: "brand_7Kp2", textGenerationId: "wgen_1" });

    assert.equal(resumed.platform, "linkedin");
  });

  it("clears a write that failed, so the same brief writes again", async () => {
    const server = new FakeServer(50);
    server.failGenerations = true;
    const { deps, store } = dependencies(server.call);

    const failed = await writeForTool(deps, input);
    assert.equal(failed.status, "failed");
    assert.equal(failed.note, FAILED_WRITE_NOTE);
    assert.equal(failed.brandId, input.brandId);
    assert.equal(failed.platform, input.platform);
    assert.equal(entries(store).length, 0);
    assert.equal(await findSameWrite(deps, input), undefined);

    server.failGenerations = false;
    const again = await writeForTool(deps, input);

    assert.equal(again.status, "succeeded");
    assert.notEqual(server.keysSeen[0], server.keysSeen[1]);
  });

  it("does not answer a stale failed write for the same brief", async () => {
    const server = new FakeServer(50);
    server.failGenerations = true;
    const store = memory();
    const { deps } = dependencies(server.call, { store });
    await startWrite(deps, { ...input, idempotencyKey: "failed-key" });
    server.failGenerations = false;

    const answer = await writeForTool(deps, input);

    assert.equal(answer.status, "previous_write_failed");
    assert.equal(answer.note, FAILED_WRITE_NOTE);
    assert.equal(entries(store).length, 0);
    const again = await writeForTool(deps, input);
    assert.equal(again.status, "succeeded");
    assert.equal(server.keysSeen.length, 2);
  });

  it("answers a renewed connection instead of a free retry, and forgets the write", async () => {
    const { deps, store } = dependencies(async () => {
      throw new ConnectionRenewedError();
    });

    await assert.rejects(writeForTool(deps, input), ConnectionRenewedError);
    assert.equal(entries(store).length, 0);
  });

  it("looks up the same write for the confirmation without signing in", async () => {
    const server = new FakeServer(50);
    const store = memory();
    await writeForTool(dependencies(server.call, { store }).deps, input);
    const { deps } = dependencies(server.call, {
      store,
      signIn: async () => assert.fail("the confirmation started a sign-in"),
    });

    assert.ok(await findSameWrite(deps, input, { signIn: false }));
  });

  it("builds a confirmation that never shows a raw brand id", () => {
    const named = confirmationFor({ ...input, brandId: "brand_7Kp2" }, "Acme Coffee");
    const unnamed = confirmationFor({ ...input, brandId: "brand_7Kp2" }, undefined);

    assert.match(named.message, /Acme Coffee/);
    assert.doesNotMatch(unnamed.message, /brand_7Kp2/);
    assert.ok(!JSON.stringify(unnamed.info).includes("brand_7Kp2"));
    assert.match(unnamed.message, /reserves 3 SocialFaktory credits/);
  });

  it("says the same brief within thirty minutes reserves nothing, unless signed in again", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      tools: { name: string; description: string }[];
    };
    const description = manifest.tools.find((tool) => tool.name === "write-post")?.description ?? "";
    const instructions = readFileSync(join(process.cwd(), "ai.yaml"), "utf8");

    assert.match(description, /within 30 minutes/);
    assert.match(description, /reserves nothing/);
    assert.match(description, /unless you signed in again in between/);
    assert.match(instructions, /reserves nothing/);
    assert.match(instructions, /signed in again/);
    assert.match(UNKNOWN_OUTCOME_NOTE, /unless you signed in again in between/);
  });

  it("tells the model to check the connection when polls could not reach SocialFaktory", async () => {
    let calls = 0;
    const { deps } = dependencies(async <T>(name: string) => {
      calls += 1;
      if (name === "generate_text") return { text_generation_id: "wgen_1", status: "pending" } as T;
      throw new McpNetworkError("Could not reach SocialFaktory.");
    });

    const answer = await writeForTool(deps, input);

    assert.ok(calls > 1);
    assert.equal(answer.status, "still_writing");
    assert.match(answer.note ?? "", /Could not reach SocialFaktory/);
  });

  it("words Check Last Write truthfully when the last post belongs to an earlier sign-in", async () => {
    const server = new FakeServer(50);
    const store = memory();
    let account = "oauth:account-1";
    const { deps } = dependencies(server.call, { store, account: () => account });
    assert.equal(await lastWriteOrMessage(deps), NO_RECENT_POST);

    await startWrite(deps, { ...brief, idempotencyKey: "key-1" });
    account = "oauth:account-2";

    assert.equal(await lastWriteOrMessage(deps), NO_POST_SINCE_SIGN_IN);
    account = "oauth:account-1";
    assert.equal(((await lastWriteOrMessage(deps)) as WriteRecord).key, "key-1");
  });

  it("builds the unreachable copy from one source", () => {
    assert.equal(UNREACHABLE_CHECK_AGAIN, `${UNREACHABLE_TITLE}. ${UNREACHABLE_ADVICE}`);
  });

  it("tells the AI to ask again, not to press Try Again, after a renewed connection", async () => {
    const { deps } = dependencies(async () => {
      throw new ConnectionRenewedError();
    });

    await assert.rejects(writeForTool(deps, input), (error: unknown) => {
      assert.ok(error instanceof ConnectionRenewedError);
      assert.equal((error as Error).message, CONNECTION_RENEWED_TOOL);
      return true;
    });
    assert.match(CONNECTION_RENEWED_TOOL, /Asking again starts a new write that reserves 3 credits/);
    assert.doesNotMatch(CONNECTION_RENEWED_TOOL, /Try Again/);
    assert.match(CONNECTION_RENEWED, /Try Again starts a new write that reserves 3 credits/);
  });

  it("titles a failed check differently from a failed write", () => {
    assert.equal(failureTitle(false), "Could not write the post");
    assert.equal(failureTitle(true), "Could not check the post");
  });

  it("describes writing as X and LinkedIn only, and tracking across all seven platforms", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { description: string };
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
    const intro = readme.split("\n").find((line) => line.trim() && !line.startsWith("#")) ?? "";

    for (const text of [manifest.description, intro]) {
      assert.match(text, /^Write X and LinkedIn posts in your brand's voice/);
      assert.match(text, /TikTok, Instagram, YouTube, X, LinkedIn, Facebook and Pinterest/);
    }
  });

  it("finds the same write for the confirmation", async () => {
    const server = new FakeServer(50);
    const { deps } = dependencies(server.call);
    await writeForTool(deps, input);

    assert.ok(await findSameWrite(deps, input));
    assert.equal(await findSameWrite(deps, { ...input, brief: "Other" }), undefined);
    assert.equal((await findSameWrite(deps, { ...input, brief: "  Boundary brief  " })) !== undefined, true);
  });

  it("asks for a brief or an id", () => {
    assert.equal(
      validateToolInput({ brandId: "brand_7Kp2" }),
      "Give a brief to write a new post, or the textGenerationId of a write to check on.",
    );
    assert.equal(validateToolInput({ brandId: "brand_7Kp2", brief: "  " }) !== undefined, true);
    assert.equal(validateToolInput(input), undefined);
    assert.equal(validateToolInput({ brandId: "brand_7Kp2", textGenerationId: "wgen_1" }), undefined);
  });
});

describe("pollWrite", () => {
  it("polls the write until it finishes", async () => {
    const { deps, calls, sleeps } = scripted([generation("running"), generation("running"), written]);
    const progress: string[] = [];

    const result = await pollWrite(deps, target, { onProgress: (next) => progress.push(next.status) });

    assert.equal(result.status, "succeeded");
    assert.deepEqual(progress, ["running", "running", "succeeded"]);
    assert.deepEqual(sleeps, [POLL_INTERVAL_MS, POLL_INTERVAL_MS]);
    assert.ok(calls.every((call) => call.name === "get_text_generation"));
    assert.deepEqual(calls[0].args, { brand_id: "brand_7Kp2", text_generation_id: "wgen_4Tz8" });
  });

  it("waits out a rate limit as long as Retry-After asks, then keeps polling", async () => {
    const limited = new McpHttpError(429, "Too many requests. Try again in 60 seconds.", 60);
    const { deps, sleeps } = scripted([generation("running"), limited, written]);

    const result = await pollWrite(deps, target);

    assert.equal(result.status, "succeeded");
    assert.deepEqual(sleeps, [POLL_INTERVAL_MS, 60_000]);
  });

  it("caps a long Retry-After", async () => {
    const limited = new McpHttpError(429, "Too many requests.", 3_600);
    const { deps, sleeps } = scripted([limited, written]);

    await pollWrite(deps, target, { timeoutMs: 10 * MAX_BACKOFF_MS });

    assert.deepEqual(sleeps, [MAX_BACKOFF_MS]);
  });

  it("backs off through server errors, timeouts and network failures", async () => {
    const { deps, sleeps } = scripted([
      new McpHttpError(503, "SocialFaktory is having trouble (503)."),
      new McpNetworkError("SocialFaktory took too long to answer."),
      new McpNetworkError("Could not reach SocialFaktory."),
      written,
    ]);

    const result = await pollWrite(deps, target);

    assert.equal(result.status, "succeeded");
    assert.deepEqual(sleeps, [2 * POLL_INTERVAL_MS, 4 * POLL_INTERVAL_MS, 8 * POLL_INTERVAL_MS]);
  });

  it("makes one last poll at the deadline instead of giving up early", async () => {
    const { deps, calls } = scripted([(now) => (now < 110_000 ? new McpHttpError(503, "busy") : written)]);

    const result = await pollWrite(deps, target, { timeoutMs: 110_000 });

    assert.equal(result.status, "succeeded");
    assert.equal(calls.at(-1)?.at, 110_000);
  });

  it("says SocialFaktory was unreachable when the window ends on a network error", async () => {
    const offline = scripted([generation("running"), new McpNetworkError("Could not reach SocialFaktory.")]);
    const busy = scripted([generation("running"), new McpHttpError(503, "down")]);

    const unreachable = await pollWrite(offline.deps, target);
    const slow = await pollWrite(busy.deps, target);

    assert.equal(unreachable.unreachable, true);
    assert.equal(slow.unreachable, undefined);
    assert.equal(
      UNREACHABLE_CHECK_AGAIN,
      "Could not reach SocialFaktory. Check your connection, then use Check Again.",
    );
  });

  it("polls once more after sleeping past the window, instead of answering a stale status", async () => {
    let polls = 0;
    const { deps, clock } = scripted([
      () => {
        polls += 1;
        if (polls === 1) {
          clock.now += WRITE_TIMEOUT_MS + 10_000;
          return generation("running");
        }
        return written;
      },
    ]);

    const result = await pollWrite(deps, target);

    assert.equal(result.status, "succeeded");
    assert.equal(polls, 2);
  });

  it("retries a final poll that fails right after waking, as a stale connection does", async () => {
    let polls = 0;
    const { deps, clock } = scripted([
      () => {
        polls += 1;
        if (polls === 1) {
          clock.now += WRITE_TIMEOUT_MS + 10_000;
          return generation("running");
        }
        if (polls === 2) return new McpNetworkError("Could not reach SocialFaktory.");
        return written;
      },
    ]);

    const result = await pollWrite(deps, target);

    assert.equal(result.status, "succeeded");
    assert.equal(polls, 3);
  });

  it("does not retry late or blame the connection when the server is only slow", async () => {
    let polls = 0;
    const { deps } = scripted([
      () => {
        polls += 1;
        return polls === 1
          ? generation("running")
          : new McpNetworkError("SocialFaktory took too long to answer.", true);
      },
    ]);

    const result = await pollWrite(deps, target, { timeoutMs: 10_000 });

    assert.equal(result.unreachable, undefined);
    const lateTimeouts = polls;
    assert.ok(lateTimeouts <= 6, `polled ${polls} times`);
  });

  it("skips the final poll when Retry-After runs past the deadline", async () => {
    const { deps, calls } = scripted([generation("running"), new McpHttpError(429, "Too many requests.", 60)]);

    await pollWrite(deps, target, { timeoutMs: 6_000 });

    assert.deepEqual(
      calls.map((call) => call.at),
      [0, POLL_INTERVAL_MS],
    );
  });

  it("answers what it has when the deadline passes while the server keeps failing", async () => {
    const { deps } = scripted([generation("running"), new McpHttpError(503, "down")]);

    const result = await pollWrite(deps, target);

    assert.equal(result.status, "running");
  });

  it("answers the pending write when no poll ever got through", async () => {
    const { deps, clock } = scripted([new McpNetworkError("Could not reach SocialFaktory.")]);

    const result = await pollWrite(deps, target);

    assert.deepEqual(result, {
      id: "wgen_4Tz8",
      status: "pending",
      platform: "linkedin",
      mode: "variants",
      variants: [],
      unreachable: true,
    });
    assert.ok(clock.now >= WRITE_TIMEOUT_MS && clock.now <= WRITE_TIMEOUT_MS + 1_000);
  });

  it("throws a refusal from the server", async () => {
    const refusal = new McpToolError("not_found", {});
    const { deps } = scripted([refusal]);

    await assert.rejects(pollWrite(deps, target), refusal);
  });

  it("checks for an abort before each poll and passes the signal along", async () => {
    const controller = new AbortController();
    const { deps, calls } = scripted([
      () => {
        controller.abort();
        return generation("running");
      },
    ]);

    await pollWrite(deps, target, { signal: controller.signal });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].options?.signal, controller.signal);
  });

  it("does not poll at all once aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { deps, calls } = scripted([written]);

    await pollWrite(deps, target, { signal: controller.signal });

    assert.equal(calls.length, 0);
  });
});

describe("abortableSleep", () => {
  it("wakes up as soon as the signal aborts", async () => {
    const controller = new AbortController();
    const started = Date.now();
    setTimeout(() => controller.abort(), 10);

    await abortableSleep(10_000, controller.signal);

    assert.ok(Date.now() - started < 1_000);
  });

  it("returns at once for a signal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const started = Date.now();

    await abortableSleep(10_000, controller.signal);

    assert.ok(Date.now() - started < 100);
  });
});
