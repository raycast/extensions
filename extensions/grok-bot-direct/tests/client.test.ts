import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  ClientError,
  createLogin,
  entryAuthor,
  entryText,
  GrokClient,
  parseBot,
  parseTokens,
  parseTranscript,
  requiredString,
  Tokens,
} from "../src/core/client";

const tokens = {
  accessToken: "fixture-access",
  refreshToken: "fixture-refresh",
};
const gateway = {
  gatewayUrl: "https://bot.example.test",
  gatewayToken: "fixture-gateway",
  networkToken: "fixture-network",
};
const bot = {
  id: "fixture-bot",
  name: "Test Teammate",
  description: "Test",
  title: "Assistant",
  isRunning: true,
  avatarColor: "red",
  avatarShape: "wedge",
};
function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function harness(
  responses: (Response | Error)[],
  initial: Tokens | undefined = tokens,
): {
  client: GrokClient;
  transport: ReturnType<typeof vi.fn>;
  saved: () => Tokens | undefined;
} {
  let current = initial;
  const transport = vi.fn(async () => {
    const value = responses.shift();
    if (value instanceof Error) throw value;
    if (!value) throw new Error("Unexpected request");
    return value;
  });
  const client = new GrokClient(
    {
      read: async () => current,
      write: async (value) => {
        current = value;
      },
    },
    transport as typeof fetch,
  );
  return { client, transport, saved: () => current };
}

describe("authentication and response boundaries", () => {
  it("labels uploaded attachments as yours", () => {
    const entry = {
      id: "t8ua0",
      kind: "user-attachment",
      file_name: "proof.txt",
    };
    expect(entryAuthor(entry, "Bot Father")).toBe("You");
    expect(entryText(entry)).toContain("Attached file: proof.txt");
    expect(
      entryText({
        id: "a",
        kind: "send-message",
        message: { type: "attachment", file_name: "result.txt" },
      }),
    ).toContain("File: result.txt");
  });
  it("creates a fresh PKCE verifier and SHA-256 challenge without putting the verifier in the URL", () => {
    const one = createLogin(123);
    const two = createLogin(123);
    const url = new URL(one.url);
    expect(one.uuid).not.toBe(two.uuid);
    expect(one.verifier).not.toBe(two.verifier);
    expect(url.origin).toBe("https://cursor.com");
    expect(url.pathname).toBe("/loginDeepControl");
    expect(url.searchParams.get("challenge")).toBe(
      createHash("sha256").update(one.verifier).digest("base64url"),
    );
    expect(url.searchParams.get("redirectTarget")).toBe("sand");
    expect(one.url).not.toContain(one.verifier);
    expect(one.createdAt).toBe(123);
    expect(createLogin().createdAt).toBeGreaterThan(123);
  });
  it.each([
    null,
    [],
    {},
    { accessToken: "", refreshToken: "x" },
    { accessToken: "x", refreshToken: " " },
  ])("rejects malformed credentials %j", (value) =>
    expect(() => parseTokens(value)).toThrow(ClientError),
  );
  it("parses credentials without keeping unrelated fields", () =>
    expect(parseTokens({ ...tokens, extra: "ignored" })).toEqual(tokens));
  it("rejects non-text identifiers", () =>
    expect(() => requiredString(7, "id")).toThrow("Invalid id"));
  it("parses bot display metadata", () =>
    expect(parseBot(bot)).toMatchObject({
      id: bot.id,
      name: bot.name,
      isRunning: true,
      avatarDataUrl: null,
      hasUnread: false,
    }));
  it("handles optional bot properties", () =>
    expect(
      parseBot({ id: "x", name: "Y", isGroup: true, hasUnread: true }),
    ).toMatchObject({
      description: "",
      title: "",
      isGroup: true,
      hasUnread: true,
    }));
  it.each([null, { id: "x" }])("rejects malformed bots", (value) =>
    expect(() => parseBot(value)).toThrow(),
  );
  it("preserves server entry data and pagination", () =>
    expect(
      parseTranscript({
        entries: [{ id: "e1", kind: "message", content: "hello" }],
        nextBeforeSeq: 0,
      }),
    ).toEqual({
      entries: [{ id: "e1", kind: "message", content: "hello" }],
      nextBeforeSeq: 0,
    }));
  it.each([
    null,
    {},
    { entries: [null] },
    { entries: [], nextBeforeSeq: -1 },
    { entries: [], nextBeforeSeq: "3" },
    { entries: [], nextBeforeSeq: 1.5 },
  ])("rejects malformed history %j", (value) =>
    expect(() => parseTranscript(value)).toThrow(),
  );
  it("extracts both user and bot message text", () => {
    expect(entryText({ id: "a", kind: "message", content: "user" })).toBe(
      "user",
    );
    expect(
      entryText({ id: "b", kind: "send-message", message: { content: "bot" } }),
    ).toBe("bot");
    expect(entryText({ id: "c", kind: "other", text: "note" })).toBe("note");
    expect(entryText({ id: "d", kind: "tool" })).toBe("Activity: tool");
    expect(entryAuthor({ id: "a", kind: "message", role: "user" }, "Bot")).toBe(
      "You",
    );
    expect(
      entryAuthor(
        { id: "a", kind: "message", fromAgent: { name: "Peer" } },
        "Bot",
      ),
    ).toBe("Peer");
    expect(entryAuthor({ id: "a", kind: "message" }, "Bot")).toBe("Bot");
  });
});

describe("sign-in polling", () => {
  it("stores an approved session", async () => {
    const h = harness([json(tokens)]);
    expect(await h.client.finishLogin(createLogin())).toBe(true);
    expect(h.saved()).toEqual(tokens);
  });
  it("treats 404 as pending, not authenticated", async () => {
    const h = harness([json({}, 404)]);
    expect(await h.client.finishLogin(createLogin())).toBe(false);
  });
  it("rejects expired login attempts before transmitting", async () => {
    const h = harness([]);
    await expect(h.client.finishLogin(createLogin(1))).rejects.toThrow(
      "expired",
    );
    expect(h.transport).not.toHaveBeenCalled();
  });
  it("reports access denial without response body leakage", async () => {
    const h = harness([json({ message: "fixture-secret" }, 403)]);
    await expect(h.client.finishLogin(createLogin())).rejects.toThrow("denied");
  });
});

describe("direct gateway", () => {
  it("uses the broker and keeps each credential on its intended connection", async () => {
    const h = harness([json(gateway), json([bot]), json([bot])]);
    expect(await h.client.bots()).toHaveLength(1);
    await h.client.bots();
    expect(h.transport).toHaveBeenCalledTimes(3);
    const calls = h.transport.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][0]).toBe(
      "https://api2.cursor.sh/aiserver.v1.GrokBotService/EnsureSandBox",
    );
    expect(calls[0][1].headers).toMatchObject({
      Authorization: "Bearer fixture-access",
    });
    expect(calls[1][0]).toBe("https://bot.example.test/api/listAgents");
    expect(calls[1][1].headers).toMatchObject({
      Authorization: "Bearer fixture-gateway",
      "x-anyrun-network-token": "fixture-network",
    });
    expect(calls[1][1].redirect).toBe("error");
  });
  it.each([
    null,
    { ...gateway, gatewayUrl: "http://bot.example.test" },
    { ...gateway, gatewayUrl: "https://user:pass@bot.example.test" },
    { ...gateway, gatewayUrl: "https://bot.example.test?secret=x" },
    { ...gateway, gatewayUrl: "https://bot.example.test#x" },
  ])("rejects insecure gateway descriptors", async (value) => {
    const h = harness([json(value)]);
    await expect(h.client.bots()).rejects.toThrow();
    expect(h.transport).toHaveBeenCalledTimes(1);
  });
  it("renews an expired session, then retries the broker once", async () => {
    const h = harness([
      json({}, 401),
      json({ access_token: "renewed", refresh_token: "rotated" }),
      json(gateway),
      json([]),
    ]);
    await h.client.bots();
    expect(h.saved()).toEqual({
      accessToken: "renewed",
      refreshToken: "rotated",
    });
    expect(h.transport).toHaveBeenCalledTimes(4);
  });
  it("retains the refresh token when the server does not rotate it", async () => {
    const h = harness([
      json({}, 401),
      json({ access_token: "renewed" }),
      json(gateway),
      json([]),
    ]);
    await h.client.bots();
    expect(h.saved()?.refreshToken).toBe(tokens.refreshToken);
  });
  it("rejects malformed refresh results", async () => {
    const h = harness([json({}, 401), json(null)]);
    await expect(h.client.bots()).rejects.toThrow("renewal failed");
  });
  it("does not retry non-authentication broker errors", async () => {
    const h = harness([json({}, 500)]);
    await expect(h.client.bots()).rejects.toThrow("500");
    expect(h.transport).toHaveBeenCalledTimes(1);
  });
  it("renews a stale gateway for read-only requests", async () => {
    const h = harness([
      json(gateway),
      json({}, 403),
      json(gateway),
      json([bot]),
    ]);
    expect(await h.client.bots()).toHaveLength(1);
    expect(h.transport).toHaveBeenCalledTimes(4);
  });
  it("does not retry rejected mutations", async () => {
    const h = harness([json(gateway), json({}, 403)]);
    await expect(h.client.send("x", "hi", "nonce")).rejects.toThrow("denied");
    expect(h.transport).toHaveBeenCalledTimes(2);
  });
  it("never resends an ambiguous message after a network failure", async () => {
    const h = harness([json(gateway), new Error("contains fixture-secret")]);
    await expect(h.client.send("x", "hi", "nonce")).rejects.toMatchObject({
      uncertain: true,
    });
    expect(h.transport).toHaveBeenCalledTimes(2);
  });
  it("reports read-only network failures without raw errors", async () => {
    const h = harness([new Error("fixture-secret")]);
    await expect(h.client.bots()).rejects.toThrow("Connection failed");
  });
  it("rejects invalid JSON with uncertain mutation status", async () => {
    const h = harness([json(gateway), new Response("not json")]);
    await expect(h.client.send("x", "hi", "nonce")).rejects.toMatchObject({
      uncertain: true,
    });
  });
  it("does not assume an arbitrary success body means message acceptance", async () => {
    const h = harness([json(gateway), json({ ok: true })]);
    await expect(h.client.send("x", "hi", "nonce")).rejects.toMatchObject({
      uncertain: true,
    });
  });
  it("preserves nonce and reply identity on accepted messages", async () => {
    const h = harness([json(gateway), json({ accepted: true })]);
    await h.client.send("bot-id", "hello", "stable-nonce", "message-id");
    const calls = h.transport.mock.calls as unknown as [string, RequestInit][];
    expect(JSON.parse(String(calls[1][1].body))).toEqual({
      agentId: "bot-id",
      prompt: "hello",
      clientNonce: "stable-nonce",
      replyToId: "message-id",
    });
  });
  it.each([" ", "x".repeat(100001)])(
    "validates message boundaries before network access",
    async (prompt) => {
      const h = harness([]);
      await expect(h.client.send("x", prompt, "n")).rejects.toThrow();
      expect(h.transport).not.toHaveBeenCalled();
    },
  );
  it("rejects malformed rosters", async () => {
    const h = harness([json(gateway), json({ bots: [] })]);
    await expect(h.client.bots()).rejects.toThrow("Invalid bot roster");
  });
  it("requests tail and older pages with server pagination", async () => {
    const h = harness([
      json(gateway),
      json({ entries: [], nextBeforeSeq: 12 }),
      json({ entries: [] }),
    ]);
    const first = await h.client.transcript("x");
    await h.client.transcript("x", first.nextBeforeSeq);
    const calls = h.transport.mock.calls as unknown as [string, RequestInit][];
    expect(calls[1][0]).toContain("getAgentTranscriptTail");
    expect(JSON.parse(String(calls[1][1].body))).toEqual({
      id: "x",
      limit: 20,
    });
    expect(calls[2][0]).toContain("getAgentTranscriptPage");
    expect(JSON.parse(String(calls[2][1].body))).toMatchObject({
      beforeSeq: 12,
      limit: 60,
    });
  });
  it("rejects path injection in commands", async () => {
    const h = harness([]);
    await expect(h.client.command("../../evil", {})).rejects.toThrow(
      "Invalid bot command",
    );
  });
  it("deduplicates concurrent broker requests", async () => {
    const h = harness([json(gateway), json([]), json([])]);
    await Promise.all([h.client.bots(), h.client.bots()]);
    expect(h.transport).toHaveBeenCalledTimes(3);
  });
});
