import { describe, it, expect } from "vitest";
import { decodeJwtPayload, extractAccountId, parseSSEStream } from "../api";

// Helper to create a fake JWT with a given payload
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = "fake-signature";
  return `${header}.${body}.${signature}`;
}

describe("decodeJwtPayload", () => {
  it("decodes a valid JWT payload", () => {
    const token = fakeJwt({ sub: "user-123", email: "test@example.com" });
    const payload = decodeJwtPayload(token);
    expect(payload.sub).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });

  it("throws on invalid JWT (missing parts)", () => {
    expect(() => decodeJwtPayload("not-a-jwt")).toThrow("Invalid JWT");
    expect(() => decodeJwtPayload("two.parts")).toThrow("Invalid JWT");
  });

  it("throws on invalid base64 payload", () => {
    expect(() => decodeJwtPayload("a.!!!.c")).toThrow();
  });
});

describe("extractAccountId", () => {
  it("extracts account ID from nested auth claim", () => {
    const token = fakeJwt({
      "https://api.openai.com/auth": {
        chatgpt_account_id: "acc-123-456",
      },
    });
    expect(extractAccountId(token)).toBe("acc-123-456");
  });

  it("extracts account ID from legacy flat claim", () => {
    const token = fakeJwt({
      "https://api.openai.com/auth.chatgpt_account_id": "legacy-acc-789",
    });
    expect(extractAccountId(token)).toBe("legacy-acc-789");
  });

  it("prefers nested claim over legacy", () => {
    const token = fakeJwt({
      "https://api.openai.com/auth": {
        chatgpt_account_id: "nested-id",
      },
      "https://api.openai.com/auth.chatgpt_account_id": "legacy-id",
    });
    expect(extractAccountId(token)).toBe("nested-id");
  });

  it("returns undefined when no account ID claim exists", () => {
    const token = fakeJwt({ sub: "user-123" });
    expect(extractAccountId(token)).toBeUndefined();
  });

  it("returns undefined for empty string account ID", () => {
    const token = fakeJwt({
      "https://api.openai.com/auth": {
        chatgpt_account_id: "   ",
      },
    });
    expect(extractAccountId(token)).toBeUndefined();
  });

  it("returns undefined for invalid token", () => {
    expect(extractAccountId("not-a-jwt")).toBeUndefined();
  });

  it("trims whitespace from account ID", () => {
    const token = fakeJwt({
      "https://api.openai.com/auth": {
        chatgpt_account_id: "  acc-trimmed  ",
      },
    });
    expect(extractAccountId(token)).toBe("acc-trimmed");
  });
});

describe("parseSSEStream", () => {
  it("parses text deltas from SSE stream", () => {
    const stream = [
      'data: {"type":"response.output_text.delta","delta":"Hello"}',
      'data: {"type":"response.output_text.delta","delta":" world"}',
      "data: [DONE]",
    ].join("\n");

    expect(parseSSEStream(stream)).toBe("Hello world");
  });

  it("ignores non-delta events", () => {
    const stream = [
      'data: {"type":"response.created","response":{}}',
      'data: {"type":"response.output_text.delta","delta":"only this"}',
      'data: {"type":"response.completed","response":{}}',
      "data: [DONE]",
    ].join("\n");

    expect(parseSSEStream(stream)).toBe("only this");
  });

  it("ignores lines without data: prefix", () => {
    const stream = [": comment", "", 'data: {"type":"response.output_text.delta","delta":"text"}', "data: [DONE]"].join(
      "\n",
    );

    expect(parseSSEStream(stream)).toBe("text");
  });

  it("returns empty string for empty stream", () => {
    expect(parseSSEStream("")).toBe("");
    expect(parseSSEStream("data: [DONE]")).toBe("");
  });

  it("stops at [DONE]", () => {
    const stream = [
      'data: {"type":"response.output_text.delta","delta":"before"}',
      "data: [DONE]",
      'data: {"type":"response.output_text.delta","delta":"after"}',
    ].join("\n");

    expect(parseSSEStream(stream)).toBe("before");
  });

  it("handles malformed JSON gracefully", () => {
    const stream = [
      "data: {not valid json}",
      'data: {"type":"response.output_text.delta","delta":"ok"}',
      "data: [DONE]",
    ].join("\n");

    expect(parseSSEStream(stream)).toBe("ok");
  });
});
