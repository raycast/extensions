import { describe, expect, it } from "vitest";
import { Final, PairOptions, PairState, finalMessage, formatCode, makeSecret, pair } from "../pair";
import { json, refused, scripted } from "./helpers";

const started = json(202, { request: "req123", code: "482913", expires: 120 });
const waiting = () => json(202, { state: "waiting" });
const SECRET = "A".repeat(32);

function run(replies: Parameters<typeof scripted>[0], extra: Partial<PairOptions> = {}, running = false) {
  const { env, calls } = scripted(replies, running);
  const states: PairState[] = [];
  let t = 0;
  const result = pair(env, 19840, {
    secret: SECRET,
    sleep: async () => {
      t += 1000;
    },
    now: () => t,
    onState: (s) => states.push(s),
    ...extra,
  });
  return { result, calls, states };
}

describe("makeSecret", () => {
  it("is 32 base64url characters and differs each time", () => {
    const a = makeSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(makeSecret()).not.toBe(a);
  });
});

describe("formatCode", () => {
  it("groups six digits like Kanso's sheet", () => expect(formatCode("482913")).toBe("482 913"));
});

describe("pair", () => {
  it("asks for a capture key, shows the code, and returns the key once allowed", async () => {
    const { result, calls, states } = run([
      started,
      waiting,
      waiting,
      json(200, { state: "allowed", key: "kcl_secretkey123", id: "k1" }),
    ]);
    expect(await result).toEqual({ step: "connected", key: "kcl_secretkey123" });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      client: "raycast",
      name: "Raycast",
      access: "capture",
      books: null,
      secret: SECRET,
    });
    expect(calls[1].url).toBe("http://127.0.0.1:19840/pair/req123");
    expect((calls[1].init?.headers as Record<string, string>)["X-Kanso-Pair-Secret"]).toBe(SECRET);
    expect(states.map((s) => s.step)).toEqual(["starting", "waiting", "connected"]);
    expect(states[1]).toMatchObject({ step: "waiting", code: "482913" });
  });

  it("403 on poll means denied", async () => {
    const { result } = run([started, json(403, { state: "denied" })]);
    expect(await result).toEqual({ step: "denied" });
  });

  it("410 expired means expired", async () => {
    const { result } = run([started, waiting, json(410, { state: "expired" })]);
    expect(await result).toEqual({ step: "expired" });
  });

  it("410 gone means the key was already delivered", async () => {
    const { result } = run([started, json(410, { state: "gone" })]);
    expect(await result).toEqual({ step: "gone" });
  });

  it("gives up as expired when Kanso never answers", async () => {
    const { result, calls } = run([started, waiting], { maxWaitMs: 5000 });
    expect(await result).toEqual({ step: "expired" });
    expect(calls.length).toBeLessThan(10);
  });

  it("429 'already waiting' is busy, and never says to approve", async () => {
    const { result } = run([
      json(429, { error: "too_many_requests", reason: "A request is already waiting in Kanso." }),
    ]);
    const final = (await result) as Final;
    expect(final).toEqual({ step: "busy" });
    const text = JSON.stringify(finalMessage(final));
    expect(text).toMatch(/Don't Allow/);
    expect(text).toMatch(/didn't start/);
    expect(text).not.toMatch(/approve/i);
  });

  it("429 on the rate limit is its own message", async () => {
    const { result } = run([
      json(429, { error: "too_many_requests", reason: "Too many pairing requests. Wait a minute and try again." }),
    ]);
    expect(await result).toEqual({ step: "rate-limited" });
  });

  it("Kanso not running", async () => {
    const { result } = run([refused()], {}, false);
    expect(await result).toMatchObject({ step: "error", error: { kind: "not-open" } });
  });

  it("local API off", async () => {
    const { result } = run([refused()], {}, true);
    expect(await result).toMatchObject({ step: "error", error: { kind: "api-off" } });
  });

  it("wrong port: a web page answers", async () => {
    const { result } = run([new Response("<html></html>", { status: 404 })]);
    expect(await result).toMatchObject({ step: "error", error: { kind: "wrong-port" } });
  });

  it("wrong port: another JSON service answers", async () => {
    const { result } = run([json(200, { hello: "world" })]);
    expect(await result).toMatchObject({ step: "error", error: { kind: "wrong-port" } });
  });

  it("Kanso quits while waiting", async () => {
    const { result } = run([started, refused()]);
    expect(await result).toMatchObject({ step: "error", error: { kind: "not-open" } });
  });

  it("stops when cancelled", async () => {
    const controller = new AbortController();
    const { result } = run([started, waiting], { signal: controller.signal, sleep: async () => controller.abort() });
    expect(await result).toMatchObject({ step: "error" });
  });

  it("never puts the key or secret in a message", () => {
    for (const s of ["denied", "expired", "gone", "busy", "rate-limited"] as const) {
      expect(JSON.stringify(finalMessage({ step: s }))).not.toMatch(/kcl_|secret/i);
    }
  });
});

describe("finalMessage", () => {
  it("uses the spec copy", () => {
    expect(finalMessage({ step: "connected", key: "k" }).title).toBe("Connected to Kanso");
    expect(finalMessage({ step: "denied" }).title).toBe("Kanso said no. Run any Kanso command to try again.");
    expect(finalMessage({ step: "expired" }).title).toBe("Kanso didn't answer in time.");
  });
});
