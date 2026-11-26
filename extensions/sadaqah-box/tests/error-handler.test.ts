import { describe, expect, test } from "bun:test";
import { ApiError, getErrorMessage, handleError, isRetryableError } from "../src/utils/error-handler";
import { ERROR_MESSAGES } from "../src/constants";

describe("error-handler", () => {
  test("categorizes ApiError HTTP statuses accurately", () => {
    expect(handleError(new ApiError("Unauthorized", 401))).toMatchObject({
      category: "auth",
      message: ERROR_MESSAGES.UNAUTHORIZED,
      statusCode: 401,
    });

    expect(handleError(new ApiError("Forbidden", 403))).toMatchObject({
      category: "auth",
      statusCode: 403,
    });

    expect(handleError(new ApiError("Missing box", 404))).toMatchObject({
      category: "not_found",
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: 404,
    });

    expect(handleError(new ApiError("Name is too long", 422))).toMatchObject({
      category: "validation",
      message: "Name is too long",
      statusCode: 422,
    });

    expect(handleError(new ApiError("Gateway timeout", 504))).toMatchObject({
      category: "server",
      message: ERROR_MESSAGES.SERVER_ERROR,
      statusCode: 504,
    });
  });

  test("categorizes AbortError and network errors", () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    expect(handleError(abortError)).toMatchObject({
      category: "timeout",
      message: ERROR_MESSAGES.TIMEOUT_ERROR,
    });

    expect(handleError(new Error("fetch failed: ECONNREFUSED"))).toMatchObject({
      category: "network",
      message: ERROR_MESSAGES.NETWORK_ERROR,
    });
  });

  test("getErrorMessage sanitizes unknown errors", () => {
    expect(getErrorMessage(new Error("internal stack detail"))).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    expect(getErrorMessage("unexpected string")).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
  });

  test("isRetryableError returns true only for transient categories", () => {
    expect(isRetryableError(handleError(new ApiError("Server error", 503)))).toBe(true);
    expect(isRetryableError(handleError(new Error("network down")))).toBe(true);
    expect(isRetryableError(handleError(new ApiError("Unauthorized", 401)))).toBe(false);
    expect(isRetryableError(handleError(new ApiError("Bad input", 422)))).toBe(false);
  });
});
