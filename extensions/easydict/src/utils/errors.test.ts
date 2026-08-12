import { beforeEach, describe, expect, it, vi } from "vitest";

import { TranslationType } from "@/types/api";

import { CancelledError, handleRequestError, RequestError } from "./errors";

const testDoubles = vi.hoisted(() => ({
  logError: vi.fn(),
}));

vi.mock("@raycast/utils", () => ({
  showFailureToast: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logError: testDoubles.logError,
  logTrace: vi.fn(),
}));

beforeEach(() => {
  testDoubles.logError.mockReset();
});

describe("handleRequestError", () => {
  it("uses the request signal to recognize a wrapped cancellation", () => {
    const controller = new AbortController();
    controller.abort();
    const wrappedAbort = new Error("AbortError: This operation was aborted");

    const result = handleRequestError(TranslationType.DeepLX, wrappedAbort, controller.signal);

    expect(result).toBeInstanceOf(CancelledError);
    expect(testDoubles.logError).not.toHaveBeenCalled();
  });

  it("keeps the same wrapped error as a real failure when the signal is active", () => {
    const controller = new AbortController();
    const wrappedAbort = new Error("AbortError: This operation was aborted");

    const result = handleRequestError(TranslationType.DeepLX, wrappedAbort, controller.signal);

    expect(result).toBeInstanceOf(RequestError);
    expect(testDoubles.logError).toHaveBeenCalledOnce();
  });

  it("still recognizes a native AbortError without a signal", () => {
    const abortError = new DOMException("This operation was aborted", "AbortError");

    const result = handleRequestError(TranslationType.DeepLX, abortError);

    expect(result).toBeInstanceOf(CancelledError);
    expect(testDoubles.logError).not.toHaveBeenCalled();
  });
});
