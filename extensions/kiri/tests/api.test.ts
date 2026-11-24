import { describe, expect, it } from "vitest";
import { ApiError, type FetchFn, KiriApi, parseKirisEarned, parseMe } from "../src/lib/api";

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };

function fake(responses: Array<{ status: number; body?: unknown }>) {
  const calls: Call[] = [];
  const http: FetchFn = async (url, init) => {
    calls.push({ url, ...init });
    const r = responses.shift();
    if (!r) throw new Error("offline");
    const text = r.body === undefined ? "" : JSON.stringify(r.body);
    return { status: r.status, text: async () => text, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  return { http, calls };
}

describe("device API", () => {
  it("starts a sign-in as the Raycast client", async () => {
    const { http, calls } = fake([
      {
        status: 200,
        body: {
          device_code: "dc",
          user_code: "ABCD-EFGH",
          verification_url: "https://project-kiri.com/connect?code=ABCD-EFGH",
          interval: 5,
          expires_in: 600,
        },
      },
    ]);
    const start = await new KiriApi(null, http).startDevice();
    expect(start).toEqual({
      deviceCode: "dc",
      userCode: "ABCD-EFGH",
      verificationUrl: "https://project-kiri.com/connect?code=ABCD-EFGH",
      intervalSeconds: 5,
      expiresInSeconds: 600,
    });
    expect(calls[0].url).toBe("https://api.project-kiri.com/api/device/start");
    expect(JSON.parse(calls[0].body ?? "{}")).toEqual({ client: "raycast", device_name: "Raycast on this Mac" });
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it("refuses a connect link outside project-kiri.com", async () => {
    const { http } = fake([
      { status: 200, body: { device_code: "dc", user_code: "X", verification_url: "https://evil.example/connect" } },
    ]);
    await expect(new KiriApi(null, http).startDevice()).rejects.toBeInstanceOf(ApiError);
  });

  it("maps poll answers", async () => {
    const { http } = fake([
      { status: 400, body: { error: "authorization_pending" } },
      { status: 400, body: { error: "slow_down" } },
      { status: 400, body: { error: "access_denied" } },
      { status: 400, body: { error: "expired_token" } },
      { status: 200, body: { access_token: "kdt_abc", account: { name: "Ana", email_hint: "a***@example.com" } } },
    ]);
    const api = new KiriApi(null, http);
    expect(await api.pollToken("dc")).toEqual({ kind: "pending" });
    expect(await api.pollToken("dc")).toEqual({ kind: "slow_down" });
    expect(await api.pollToken("dc")).toEqual({ kind: "denied" });
    expect(await api.pollToken("dc")).toEqual({ kind: "expired" });
    expect(await api.pollToken("dc")).toEqual({
      kind: "ok",
      token: "kdt_abc",
      account: { name: "Ana", emailHint: "a***@example.com" },
    });
  });

  it("sends the token only as a Bearer header and reports the kiris of a new block", async () => {
    const { http, calls } = fake([
      { status: 201, body: { id: "x", kiris_earned: 1 } },
      { status: 200, body: { id: "x", kiris_earned: 1 } },
    ]);
    const api = new KiriApi("kdt_secret", http);
    const body = {
      client_block_id: "x",
      started_at: "2026-11-23T09:00:00.000Z",
      duration_seconds: 1500,
      ambient: "",
      binaural: "",
      intent: "",
    };
    expect(await api.postFocusSession(body)).toBe(1);
    expect(await api.postFocusSession(body)).toBe(0);
    expect(calls[0].headers.Authorization).toBe("Bearer kdt_secret");
    expect(calls[0].url).not.toContain("kdt_secret");
    expect(calls[0].body).not.toContain("kdt_secret");
  });

  it("turns errors into ApiError with the server's message", async () => {
    const { http } = fake([{ status: 401, body: { error: "invalid_token", message: "This app is not connected." } }]);
    const err = await new KiriApi("kdt_x", http).me().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("invalid_token");
    expect(err.retryable).toBe(false);
    const offline = await new KiriApi("kdt_x", fake([]).http).me().catch((e) => e);
    expect(offline.status).toBe(0);
    expect(offline.retryable).toBe(true);
  });

  it("needs a token for account calls", async () => {
    const { http, calls } = fake([]);
    await expect(new KiriApi(null, http).me()).rejects.toMatchObject({ code: "not_connected" });
    expect(calls).toHaveLength(0);
  });

  it("reads /me defensively", () => {
    const me = parseMe({
      account: { name: "Ana", email_hint: "a***@example.com" },
      plan: "free",
      sounds: [
        { key: "rain", label: "Rain", available: true },
        { key: "../x", label: "Bad", available: true },
        { key: "sea", label: "Sea", available: false },
      ],
      kiris_total: 12.7,
    });
    expect(me.plan).toBe("free");
    expect(me.sounds.map((s) => s.key)).toEqual(["rain", "sea"]);
    expect(me.kirisTotal).toBe(12);
    expect(parseMe("nonsense")).toEqual({ account: { name: "", emailHint: "" }, plan: null, sounds: [], kirisTotal: null });
  });

  it("only a new block earns kiris", () => {
    expect(parseKirisEarned(201, { kiris_earned: 0.4 })).toBe(0.4);
    expect(parseKirisEarned(200, { kiris_earned: 1 })).toBe(0);
    expect(parseKirisEarned(201, { kiris_earned: "1" })).toBe(0);
  });
});
