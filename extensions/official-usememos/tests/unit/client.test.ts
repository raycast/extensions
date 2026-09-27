import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "../../src/api/apiError";
import { getCurrentUser } from "../../src/api/auth";
import { memosFetch, REQUEST_TIMEOUT_MS } from "../../src/api/client";

const connection = { instanceUrl: "https://memos.example.com", accessToken: "test-token" };
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("memosFetch", () => {
  it("sends the bearer token to the instance and returns parsed data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await memosFetch(connection, "/api/v1/ping", z.object({ ok: z.boolean() }));

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://memos.example.com/api/v1/ping",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-token" }) }),
    );
  });

  it("throws a readable ApiError for HTTP failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "unauthenticated" }, 401)));

    const request = memosFetch(connection, "/api/v1/ping", z.object({}));

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toThrow("rejected the access token");
  });

  it("explains an unreachable instance instead of a transport error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(memosFetch(connection, "/api/v1/ping", z.object({}))).rejects.toThrow(
      "Couldn't reach https://memos.example.com. Check the instance URL and your network connection.",
    );
  });

  it("explains a timed-out request instead of leaking a TimeoutError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError")));

    const request = memosFetch(connection, "/api/v1/ping", z.object({}));

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toThrow(
      "Couldn't reach https://memos.example.com. Check the instance URL and your network connection.",
    );
  });

  it("sends a request that aborts after REQUEST_TIMEOUT_MS", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await memosFetch(connection, "/api/v1/ping", z.object({ ok: z.boolean() }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://memos.example.com/api/v1/ping",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
  });

  it("explains a response that doesn't match the expected shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html></html>", { status: 200 })));

    await expect(memosFetch(connection, "/api/v1/ping", z.object({ ok: z.boolean() }))).rejects.toThrow(
      "https://memos.example.com sent a response the extension doesn't recognize. Make sure the URL points at an up-to-date Memos instance.",
    );
  });
});

describe("getCurrentUser", () => {
  it("reads the user from /api/v1/auth/me", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ user: { name: "users/1", username: "steven", displayName: "Steven" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCurrentUser(connection)).resolves.toEqual({
      name: "users/1",
      username: "steven",
      displayName: "Steven",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://memos.example.com/api/v1/auth/me");
  });
});
