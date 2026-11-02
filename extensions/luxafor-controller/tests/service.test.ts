import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BusyError,
  LuxaforService,
  REQUEST_TIMEOUT_MS,
  classifyResponse,
  confirmRedTest,
  resultMessage,
  type RequestGuard,
  type Transport,
} from "../src/luxafor-service";
import { emptyState, type Command, type SavedState, type StateStore } from "../src/luxafor-state";
const red: Command = { kind: "solid", colour: "red" };
const green: Command = { kind: "solid", colour: "green" };
const accepted: Transport = () => Promise.resolve({ status: 200, json: async () => ({ success: true }) });
const config = { userId: "synthetic-private-user-id", apiEndpoint: "com" };
function fixture(transport: Transport = vi.fn(accepted)) {
  let state: SavedState = emptyState();
  let locked = false;
  const store: StateStore = {
    read: vi.fn(async () => structuredClone(state)),
    write: vi.fn(async (next) => {
      state = structuredClone(next);
    }),
  };
  const guard: RequestGuard = vi.fn(async () => {
    if (locked) throw new BusyError();
    locked = true;
    return async () => {
      locked = false;
    };
  });
  return { service: new LuxaforService(config, store, transport, guard), store, guard, transport, state: () => state };
}
afterEach(() => vi.useRealTimers());

describe("confirmation and read-only lifecycle", () => {
  it("Cancel and dismiss send zero requests and do not change persisted state", async () => {
    const f = fixture();
    await f.service.send(green);
    vi.mocked(f.transport).mockClear();
    vi.mocked(f.store.write).mockClear();
    const previous = f.state();
    expect(
      await confirmRedTest(
        async () => false,
        () => f.service.send(red),
      ),
    ).toBeUndefined();
    expect(f.transport).not.toHaveBeenCalled();
    expect(f.store.write).not.toHaveBeenCalled();
    expect(f.state()).toEqual(previous);
  });
  it("confirmation sends exactly one red request", async () => {
    const f = fixture();
    await confirmRedTest(
      async () => true,
      () => f.service.send(red),
    );
    expect(f.transport).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(f.transport).mock.calls[0][1].body as string)).toEqual({
      userId: config.userId,
      actionFields: { color: "red" },
    });
  });
  it("opening, reading, refreshing and reloading have no side effects", async () => {
    const f = fixture();
    await f.service.read();
    await f.service.read();
    const reloaded = new LuxaforService(config, f.store, f.transport, f.guard);
    await reloaded.read();
    expect(f.transport).not.toHaveBeenCalled();
    expect(f.store.write).not.toHaveBeenCalled();
  });
});

describe("documented transport contract and defensive response handling", () => {
  it.each([{}, { success: true }, { status: "success" }])("accepts HTTP 200 with a JSON object: %j", (body) => {
    expect(classifyResponse(200, body)).toBe("accepted");
  });
  it.each([{ success: false }, { error: "secret" }, { errors: ["private"] }, { status: "error" }])(
    "rejects explicit errors without exporting body: %j",
    async (body) => {
      const f = fixture(vi.fn(async () => ({ status: 200, json: async () => body })));
      expect(await f.service.send(red)).toEqual({ ok: false, reason: "application", uncertain: false });
      expect(f.state().accepted).toBeUndefined();
      expect(JSON.stringify(f.state())).not.toMatch(/secret|private/);
    },
  );
  it.each([201, 204, 301, 400, 401, 429, 500, 503])("rejects HTTP %s without retrying", async (status) => {
    const json = vi.fn();
    const f = fixture(vi.fn(async () => ({ status, json })));
    expect(await f.service.send(red)).toEqual({ ok: false, reason: "http", uncertain: true });
    expect(f.transport).toHaveBeenCalledTimes(1);
    expect(json).not.toHaveBeenCalled();
  });
  it.each([null, [], "success", false, 1])("does not promote an unrecognised JSON shape %j", async (body) => {
    const f = fixture(async () => ({ status: 200, json: async () => body }));
    expect(await f.service.send(red)).toEqual({ ok: false, reason: "response", uncertain: true });
  });
  it("rejects malformed JSON", async () => {
    const f = fixture(async () => ({
      status: 200,
      json: async () => {
        throw new Error("raw response");
      },
    }));
    expect(await f.service.send(red)).toMatchObject({ ok: false, reason: "response" });
  });
  it("never follows redirects with the private identifier", async () => {
    const f = fixture();
    await f.service.send(red);
    expect(vi.mocked(f.transport).mock.calls[0][1].redirect).toBe("error");
  });
});

describe("honest state, concurrency and cancellation", () => {
  it("pending does not overwrite accepted history; failure preserves it", async () => {
    const transport = vi.fn(accepted);
    const f = fixture(transport);
    await f.service.send(green);
    const previous = f.state().accepted;
    let fail!: (error: Error) => void;
    transport.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        }),
    );
    const request = f.service.send(red);
    await vi.waitFor(() => expect(fail).toBeTypeOf("function"));
    expect(f.state().attempt?.outcome).toBe("pending");
    expect(f.state().accepted).toEqual(previous);
    fail(new Error(config.userId));
    expect(await request).toEqual({ ok: false, reason: "network", uncertain: true });
    expect(f.state().accepted).toEqual(previous);
    expect(f.state().recent).toEqual(["00ff00"]);
  });
  it("rejects duplicate and separate-command overlaps without queueing", async () => {
    let finish!: () => void;
    const transport = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<Transport>>>((resolve) => {
          finish = () => resolve({ status: 200, json: async () => ({}) });
        }),
    );
    const f = fixture(transport);
    const other = new LuxaforService(config, f.store, transport, f.guard);
    const first = f.service.send(red);
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    expect(await f.service.send(green)).toMatchObject({ reason: "busy" });
    expect(await other.send(green)).toMatchObject({ reason: "busy" });
    finish();
    await first;
    expect(transport).toHaveBeenCalledTimes(1);
    expect(f.state().accepted?.command).toEqual(red);
  });
  it("times out once, aborts transport, and ignores a late response after a newer command", async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const transport = vi.fn(accepted).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ status: 200, json: async () => ({}) });
        }),
    );
    const f = fixture(transport);
    const first = f.service.send(red);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(await first).toEqual({ ok: false, reason: "timeout", uncertain: true });
    expect(transport.mock.calls[0][1].signal?.aborted).toBe(true);
    expect(transport).toHaveBeenCalledTimes(1);
    await f.service.send(green);
    finish();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(f.state().accepted?.command).toEqual(green);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("timeout includes response body parsing", async () => {
    vi.useFakeTimers();
    const f = fixture(async () => ({ status: 200, json: () => new Promise(() => undefined) }));
    const request = f.service.send(red);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(await request).toMatchObject({ reason: "timeout", uncertain: true });
  });
  it("teardown aborts and cannot commit a late success", async () => {
    const controller = new AbortController();
    const f = fixture(vi.fn<Transport>(() => new Promise(() => undefined)));
    const request = f.service.send(red, controller.signal);
    await vi.waitFor(() => expect(f.transport).toHaveBeenCalledTimes(1));
    controller.abort();
    expect(await request).toEqual({ ok: false, reason: "cancelled", uncertain: true });
    expect(f.state().accepted).toBeUndefined();
  });
  it("pre-cancelled actions write and send nothing", async () => {
    const f = fixture();
    const controller = new AbortController();
    controller.abort();
    expect(await f.service.send(red, controller.signal)).toMatchObject({ reason: "cancelled", uncertain: false });
    expect(f.transport).not.toHaveBeenCalled();
    expect(f.store.write).not.toHaveBeenCalled();
  });
  it("blink has no timer to restore over newer commands; white uses supported named colour", async () => {
    vi.useFakeTimers();
    const f = fixture();
    await f.service.send({ kind: "blink", colour: "white" });
    expect(f.state().accepted?.command).toEqual({ kind: "blink", colour: "white" });
    expect(JSON.parse(vi.mocked(f.transport).mock.calls[0][1].body as string).actionFields).toEqual({ color: "white" });
    await f.service.send(green);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.state().accepted?.command).toEqual(green);
    expect(f.transport).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("storage failure before sending blocks side effects", async () => {
    const f = fixture();
    vi.mocked(f.store.write).mockRejectedValue(new Error(config.userId));
    const result = await f.service.send(red);
    expect(result).toEqual({ ok: false, reason: "storage", uncertain: false });
    expect(f.transport).not.toHaveBeenCalled();
  });
  it("storage failure after acceptance does not encourage an automatic resend", async () => {
    const f = fixture();
    vi.mocked(f.store.write)
      .mockImplementationOnce(async () => undefined)
      .mockRejectedValueOnce(new Error("disk"));
    expect(await f.service.send(red)).toEqual({ ok: true, persisted: false });
    expect(f.transport).toHaveBeenCalledTimes(1);
  });
  it("lost lock cancels the request and never writes a stale result", async () => {
    let lose!: () => void;
    const f = fixture(vi.fn<Transport>(() => new Promise(() => undefined)));
    const guard: RequestGuard = async (onLost) => {
      lose = onLost;
      return async () => undefined;
    };
    const service = new LuxaforService(config, f.store, f.transport, guard);
    const request = service.send(red);
    await vi.waitFor(() => expect(f.transport).toHaveBeenCalled());
    lose();
    await request;
    expect(f.store.write).toHaveBeenCalledTimes(1);
    expect(f.state().accepted).toBeUndefined();
  });
  it("raw transport errors, response bodies and IDs never appear in result, state or recovery text", async () => {
    const f = fixture(async () => {
      throw new Error(`https://bad/${config.userId}`);
    });
    const result = await f.service.send(red);
    expect(JSON.stringify([result, f.state(), resultMessage(result)])).not.toContain(config.userId);
  });
  it.each(["https://evil.test", "", "com/other"])("refuses unrecognised endpoint %s", async (apiEndpoint) => {
    const f = fixture();
    const service = new LuxaforService({ ...config, apiEndpoint }, f.store, f.transport, f.guard);
    expect(await service.send(red)).toMatchObject({ reason: "configuration" });
    expect(f.transport).not.toHaveBeenCalled();
  });
});

describe("recent successful choices", () => {
  it("keeps five canonical, deduplicated solid choices, with latest first", async () => {
    const f = fixture();
    for (const colour of ["red", "green", "blue", "yellow", "cyan", "magenta", "ff0000"])
      await f.service.send({ kind: "solid", colour });
    expect(f.state().recent).toEqual(["ff0000", "ff00ff", "00ffff", "ffff00", "0000ff"]);
    await f.service.send({ kind: "blink", colour: "green" });
    expect(f.state().recent).toEqual(["ff0000", "ff00ff", "00ffff", "ffff00", "0000ff"]);
  });
  it("clear and forget operate locally without changing accepted history", async () => {
    const f = fixture();
    await f.service.send(green);
    const previous = f.state().accepted;
    await f.store.write({ ...f.state(), legacyColour: "ffffff" });
    vi.mocked(f.transport).mockClear();
    await f.service.clearRecent();
    expect(f.state().recent).toEqual([]);
    expect(f.state().accepted).toEqual(previous);
    expect(f.state().legacyColour).toBe("ffffff");
    await f.service.clearRecent(true);
    expect(f.state().legacyColour).toBeUndefined();
    expect(f.state().accepted).toEqual(previous);
    expect(f.transport).not.toHaveBeenCalled();
  });
  it.each(["", "ab", "#xyz", "1234567"])(
    "service rejects unnormalised or invalid custom colour %s without writes or requests",
    async (colour) => {
      const f = fixture();
      expect(await f.service.send({ kind: "solid", colour })).toMatchObject({ ok: false });
      expect(f.transport).not.toHaveBeenCalled();
      expect(f.store.write).not.toHaveBeenCalled();
    },
  );
  it("does not send after a suspended command exceeds its deadline during storage", async () => {
    let now = 1000;
    const f = fixture();
    vi.mocked(f.store.read).mockImplementationOnce(async () => {
      now += 60_000;
      return emptyState();
    });
    const service = new LuxaforService(config, f.store, f.transport, f.guard, () => now);
    expect(await service.send(red)).toMatchObject({ reason: "timeout", uncertain: false });
    expect(f.transport).not.toHaveBeenCalled();
    expect(f.store.write).not.toHaveBeenCalled();
  });
});
it("a command resuming long after its lease cannot overwrite a newer persisted outcome", async () => {
  let now = 1000;
  let finish!: () => void;
  const f = fixture(
    vi.fn<Transport>(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ status: 200, json: async () => ({}) });
        }),
    ),
  );
  const service = new LuxaforService(config, f.store, f.transport, f.guard, () => now);
  const request = service.send(red);
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  // Simulate a suspended runtime whose lease has expired while another command finishes.
  now = 100_000;
  const newer: SavedState = { version: 2, recent: ["00ff00"], accepted: { command: green, acceptedAt: 50_000 } };
  await f.store.write(newer);
  finish();
  expect(await request).toMatchObject({ reason: "timeout" });
  expect(f.state()).toEqual(newer);
});
it("stores only the accepted command fields, even when a caller supplies extra private data", async () => {
  const f = fixture();
  await f.service.send({ ...red, userId: config.userId } as Command);
  expect(JSON.stringify(f.state())).not.toContain(config.userId);
});
