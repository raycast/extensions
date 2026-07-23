import { afterEach, describe, expect, it, vi } from "vitest";
import { polishText, PolishError } from "./polish";

describe("polishText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the polished text on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "polished text" } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await polishText("hello", "openai", "sk-test-key");

    expect(result).toBe("polished text");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws a PolishError with a clear message on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    await expect(polishText("hello", "openai", "bad-key")).rejects.toThrow(
      PolishError,
    );
    await expect(polishText("hello", "openai", "bad-key")).rejects.toThrow(
      /API key was rejected/,
    );
    await polishText("hello", "openai", "bad-key").catch((e) => {
      expect(e.isAuthError).toBe(true);
    });
  });

  it("throws a PolishError with a clear message on 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }),
    );

    await expect(polishText("hello", "openai", "sk-test-key")).rejects.toThrow(
      /rate-limited/,
    );
    await polishText("hello", "openai", "sk-test-key").catch((e) => {
      expect(e.isAuthError).toBeFalsy();
    });
  });

  it("throws a PolishError with the status code for other HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );

    await expect(polishText("hello", "openai", "sk-test-key")).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it("throws a PolishError when the request times out", async () => {
    const abortError = new Error("timed out");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    await expect(polishText("hello", "openai", "sk-test-key")).rejects.toThrow(
      /timed out/,
    );
  });

  it("throws a PolishError when the response body stalls after headers arrive", async () => {
    const abortError = new Error("timed out");
    abortError.name = "AbortError";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(abortError),
      }),
    );

    await expect(polishText("hello", "openai", "sk-test-key")).rejects.toThrow(
      /timed out/,
    );
  });

  it("throws a PolishError when the network request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    await expect(polishText("hello", "openai", "sk-test-key")).rejects.toThrow(
      /Could not reach/,
    );
  });

  it("wraps a malformed 200 response in a PolishError", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );

    const error = await polishText("hello", "openai", "sk-test-key").catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(PolishError);
    expect(error.message).toBeTruthy();
  });
});
