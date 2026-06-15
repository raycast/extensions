/**
 * Tests for useAccounts hook.
 *
 * These tests verify our hook's business logic:
 * - Execute guards based on session state
 * - Early returns when session data is missing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAccounts } from "./useAccounts";
import { usePromise } from "@raycast/utils";

vi.mock("../api/endpoints", () => ({
  getMonetaryAccounts: vi.fn(),
}));

vi.mock("./useBunqSession", () => ({
  withSessionRefresh: vi.fn((session, fn) => fn()),
}));

describe("useAccounts", () => {
  const createMockSession = (overrides = {}) =>
    ({
      isLoading: false,
      isConfigured: true,
      error: null,
      userId: "test-user-123",
      sessionToken: "test-token",
      privateKey: "mock-private-key",
      refresh: vi.fn(),
      reset: vi.fn(),
      getRequestOptions: vi.fn(() => ({
        authToken: "test-token",
      })),
      ...overrides,
    }) as unknown as Parameters<typeof useAccounts>[0];

  const createMockUsePromiseResult = () =>
    ({
      data: undefined,
      isLoading: false,
      error: undefined,
      revalidate: vi.fn(),
      mutate: vi.fn(),
    }) as unknown as ReturnType<typeof usePromise>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePromise).mockImplementation(() => createMockUsePromiseResult());
  });

  describe("execute guards", () => {
    it("does not execute when session is not configured", () => {
      const session = createMockSession({ isConfigured: false });
      renderHook(() => useAccounts(session));

      expect(usePromise).toHaveBeenCalledWith(expect.any(Function), [], { execute: false });
    });

    it("does not execute when session is loading", () => {
      const session = createMockSession({ isLoading: true });
      renderHook(() => useAccounts(session));

      expect(usePromise).toHaveBeenCalledWith(expect.any(Function), [], { execute: false });
    });
  });

  describe("early returns", () => {
    it("returns empty array when session has no userId", async () => {
      let capturedFn: (() => Promise<unknown[]>) | null = null;
      vi.mocked(usePromise).mockImplementation((fn) => {
        capturedFn = fn as () => Promise<unknown[]>;
        return createMockUsePromiseResult();
      });

      const session = createMockSession({ userId: null });
      renderHook(() => useAccounts(session));

      const result = await capturedFn!();
      expect(result).toEqual([]);
    });

    it("returns empty array when session has no sessionToken", async () => {
      let capturedFn: (() => Promise<unknown[]>) | null = null;
      vi.mocked(usePromise).mockImplementation((fn) => {
        capturedFn = fn as () => Promise<unknown[]>;
        return createMockUsePromiseResult();
      });

      const session = createMockSession({ sessionToken: null });
      renderHook(() => useAccounts(session));

      const result = await capturedFn!();
      expect(result).toEqual([]);
    });
  });
});
