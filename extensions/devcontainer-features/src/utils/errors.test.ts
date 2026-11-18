import { describe, expect, it } from "vitest";
import {
  createAppError,
  createHttpError,
  getErrorCode,
  getUserErrorMessage,
  httpStatusToErrorCode,
  isAppError,
  isRetryableError,
  toAppError,
} from "./errors";

describe("createAppError", () => {
  it("creates error with correct structure", () => {
    const error = createAppError("NETWORK_ERROR", "Connection failed");

    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.message).toBe("Connection failed");
    expect(error.userMessage).toBe(
      "Unable to connect. Please check your internet connection.",
    );
    expect(error.retryable).toBe(true);
  });

  it("includes details when provided", () => {
    const details = { statusCode: 500 };
    const error = createAppError("INVALID_RESPONSE", "Bad response", details);

    expect(error.details).toEqual(details);
  });

  it("includes httpStatus when provided", () => {
    const error = createAppError(
      "SERVER_ERROR",
      "Server error",
      undefined,
      503,
    );

    expect(error.httpStatus).toBe(503);
  });

  it("handles rate limit error", () => {
    const error = createAppError("RATE_LIMIT_EXCEEDED", "Rate limit hit");

    expect(error.retryable).toBe(false);
    expect(error.userMessage).toContain("rate limit");
  });
});

describe("httpStatusToErrorCode", () => {
  it("maps 401 to UNAUTHORIZED", () => {
    expect(httpStatusToErrorCode(401)).toBe("UNAUTHORIZED");
  });

  it("maps 403 to FORBIDDEN", () => {
    expect(httpStatusToErrorCode(403)).toBe("FORBIDDEN");
  });

  it("maps 404 to NOT_FOUND", () => {
    expect(httpStatusToErrorCode(404)).toBe("NOT_FOUND");
  });

  it("maps 408 to TIMEOUT", () => {
    expect(httpStatusToErrorCode(408)).toBe("TIMEOUT");
  });

  it("maps 429 to RATE_LIMIT_EXCEEDED", () => {
    expect(httpStatusToErrorCode(429)).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("maps 5xx to SERVER_ERROR", () => {
    expect(httpStatusToErrorCode(500)).toBe("SERVER_ERROR");
    expect(httpStatusToErrorCode(502)).toBe("SERVER_ERROR");
    expect(httpStatusToErrorCode(503)).toBe("SERVER_ERROR");
  });

  it("maps unknown codes to UNKNOWN", () => {
    expect(httpStatusToErrorCode(400)).toBe("UNKNOWN");
    expect(httpStatusToErrorCode(418)).toBe("UNKNOWN");
  });
});

describe("createHttpError", () => {
  it("creates error from HTTP status", () => {
    const error = createHttpError(404, "Resource not found");

    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Resource not found");
    expect(error.httpStatus).toBe(404);
    expect(error.retryable).toBe(false);
  });

  it("creates error for server errors", () => {
    const error = createHttpError(503, "Service unavailable");

    expect(error.code).toBe("SERVER_ERROR");
    expect(error.retryable).toBe(true);
  });
});

describe("toAppError", () => {
  it("converts Error to AppError", () => {
    const error = new Error("Something went wrong");
    const appError = toAppError(error);

    expect(appError.code).toBe("UNKNOWN");
    expect(appError.message).toBe("Something went wrong");
  });

  it("returns existing AppError unchanged", () => {
    const original = createAppError("NOT_FOUND", "Not found");
    const result = toAppError(original);

    expect(result).toBe(original);
  });

  it("detects network errors", () => {
    const error = new Error("fetch failed");
    const appError = toAppError(error);

    expect(appError.code).toBe("NETWORK_ERROR");
  });

  it("detects TypeError as network error", () => {
    const error = new TypeError("Failed to fetch");
    const appError = toAppError(error);

    expect(appError.code).toBe("NETWORK_ERROR");
  });

  it("detects timeout errors", () => {
    const error = new Error("Request timeout");
    const appError = toAppError(error);

    expect(appError.code).toBe("TIMEOUT");
  });

  it("detects AbortError as timeout", () => {
    const error = new Error("Aborted");
    error.name = "AbortError";
    const appError = toAppError(error);

    expect(appError.code).toBe("TIMEOUT");
  });

  it("detects rate limit errors", () => {
    const error = new Error("rate limit exceeded");
    const appError = toAppError(error);

    expect(appError.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("handles non-Error values", () => {
    const appError = toAppError("string error");

    expect(appError.code).toBe("UNKNOWN");
    expect(appError.message).toBe("string error");
  });

  it("handles null", () => {
    const appError = toAppError(null);

    expect(appError.code).toBe("UNKNOWN");
    expect(appError.message).toBe("null");
  });
});

describe("isAppError", () => {
  it("returns true for valid AppError", () => {
    const error = createAppError("NOT_FOUND", "Not found");
    expect(isAppError(error)).toBe(true);
  });

  it("returns false for regular Error", () => {
    const error = new Error("test");
    expect(isAppError(error)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAppError(null)).toBe(false);
  });

  it("returns false for incomplete objects", () => {
    expect(isAppError({ code: "TEST" })).toBe(false);
    expect(isAppError({ code: "TEST", message: "msg" })).toBe(false);
  });
});

describe("isRetryableError", () => {
  it("returns true for retryable errors", () => {
    const error = createAppError("NETWORK_ERROR", "Failed");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for non-retryable errors", () => {
    const error = createAppError("RATE_LIMIT_EXCEEDED", "Limit hit");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for UNAUTHORIZED", () => {
    const error = createAppError("UNAUTHORIZED", "Auth failed");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for FORBIDDEN", () => {
    const error = createAppError("FORBIDDEN", "Access denied");
    expect(isRetryableError(error)).toBe(false);
  });

  it("handles unknown errors as retryable", () => {
    expect(isRetryableError(new Error("Unknown"))).toBe(true);
  });
});

describe("getUserErrorMessage", () => {
  it("returns user-friendly message for AppError", () => {
    const error = createAppError("NOT_FOUND", "Resource not found");
    expect(getUserErrorMessage(error)).toBe(
      "The requested resource was not found.",
    );
  });

  it("returns message for new error types", () => {
    expect(
      getUserErrorMessage(createAppError("UNAUTHORIZED", "test")),
    ).toContain("Authentication");
    expect(getUserErrorMessage(createAppError("FORBIDDEN", "test"))).toContain(
      "Access denied",
    );
    expect(getUserErrorMessage(createAppError("TIMEOUT", "test"))).toContain(
      "timed out",
    );
    expect(
      getUserErrorMessage(createAppError("SERVER_ERROR", "test")),
    ).toContain("Server error");
  });

  it("converts unknown errors", () => {
    const error = new Error("Technical error");
    const message = getUserErrorMessage(error);
    expect(message).toBe("An unexpected error occurred.");
  });
});

describe("getErrorCode", () => {
  it("returns code from AppError", () => {
    const error = createAppError("NOT_FOUND", "Not found");
    expect(getErrorCode(error)).toBe("NOT_FOUND");
  });

  it("returns code from converted error", () => {
    const error = new Error("fetch failed");
    expect(getErrorCode(error)).toBe("NETWORK_ERROR");
  });
});
