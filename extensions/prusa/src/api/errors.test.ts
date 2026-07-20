import { describe, expect, test } from "vitest";
import { ERROR_MESSAGES, PrusaApiError, classifyPrusaConnectionError } from "./errors";

describe("classifyPrusaConnectionError", () => {
  test.each(["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND", "ETIMEDOUT", "ECONNABORTED"])(
    "treats %s as printer offline",
    (code) => {
      expect(classifyPrusaConnectionError({ code, message: "connect failed" })).toEqual({
        message: ERROR_MESSAGES.PRINTER_OFFLINE,
        kind: "offline",
      });
    },
  );

  test("treats timeout messages without a code as printer offline", () => {
    expect(classifyPrusaConnectionError({ message: "timeout of 10000ms exceeded" })).toEqual({
      message: ERROR_MESSAGES.PRINTER_OFFLINE,
      kind: "offline",
    });
  });

  test("keeps unknown connection failures as generic network errors", () => {
    expect(classifyPrusaConnectionError({ message: "socket hang up" })).toEqual({
      message: ERROR_MESSAGES.NETWORK_ERROR,
      kind: "network",
    });
  });

  test("does not retry offline printer errors", () => {
    const error = new PrusaApiError(ERROR_MESSAGES.PRINTER_OFFLINE, undefined, undefined, true, "offline");

    expect(error).toBeInstanceOf(PrusaApiError);
    expect(PrusaApiError.isRetryable(error)).toBe(false);
  });
});
