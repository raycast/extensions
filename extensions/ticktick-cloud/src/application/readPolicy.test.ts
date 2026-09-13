import { describe, expect, it, vi } from "vitest";

import {
  AmbiguousMutationError,
  AuthenticationError,
  NetworkError,
  NotFoundError,
  PermissionError,
  ProtocolError,
  RateLimitError,
  ValidationError,
} from "../domain/errors";
import { executeRead } from "./readPolicy";

describe("executeRead", () => {
  it("retries a retryable read exactly once after the default delay", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new NetworkError("offline"))
      .mockResolvedValue("ok");
    const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);

    await expect(executeRead(operation, sleep)).resolves.toBe("ok");

    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("does not make a third attempt when the retry also fails", async () => {
    const finalError = new NetworkError("still offline");
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new NetworkError("offline"))
      .mockRejectedValueOnce(finalError);

    await expect(executeRead(operation, async () => undefined)).rejects.toBe(finalError);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("uses Retry-After for the only rate-limit retry", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new RateLimitError("slow down", 1_750))
      .mockResolvedValue("ok");
    const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);

    await expect(executeRead(operation, sleep)).resolves.toBe("ok");
    expect(sleep).toHaveBeenCalledWith(1_750);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry a rate limit without a usable Retry-After delay", async () => {
    const error = new RateLimitError("slow down");
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(error);
    const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);

    await expect(executeRead(operation, sleep)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("does not start an operation for an already-aborted read", async () => {
    const controller = new AbortController();
    controller.abort();
    const operation = vi.fn<() => Promise<string>>().mockResolvedValue("must not run");
    const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);

    await expect(executeRead(operation, sleep, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(operation).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("does not retry when the read is aborted after its first failure", async () => {
    const controller = new AbortController();
    const operation = vi.fn<() => Promise<string>>().mockImplementation(async () => {
      controller.abort();
      throw new NetworkError("offline");
    });

    await expect(executeRead(operation, async () => undefined, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(operation).toHaveBeenCalledOnce();
  });

  it("checks for abort again after retry sleep and before the second attempt", async () => {
    const controller = new AbortController();
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new NetworkError("offline"))
      .mockResolvedValue("must not retry");
    const sleep = vi.fn(async () => controller.abort());

    await expect(executeRead(operation, sleep, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(sleep).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledOnce();
  });

  it.each([
    new AuthenticationError("sign in"),
    new PermissionError("forbidden"),
    new ValidationError("invalid"),
    new ProtocolError("unsupported"),
    new NotFoundError("missing"),
    new AmbiguousMutationError("unknown mutation outcome"),
  ])("never retries non-read-safe $name failures", async (error) => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(error);
    const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);

    await expect(executeRead(operation, sleep)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });
});
