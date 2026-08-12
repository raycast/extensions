/**
 * Tests for useCommandState hook.
 *
 * These tests verify our hook's business logic:
 * - isReady calculation based on loading/error states
 * - loadingView and errorView conditional rendering logic
 * - withAccounts option behavior (conditional loading and error handling)
 * - revalidate orchestration (session refresh + account revalidation)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCommandState } from "./useCommandState";
import { useBunqSession } from "./useBunqSession";
import { useAccounts } from "./useAccounts";

vi.mock("./useBunqSession");
vi.mock("./useAccounts");
vi.mock("../lib/errors", () => ({
  getErrorMessage: vi.fn((e) => e?.message || "Unknown error"),
}));

// Mock Raycast API components
vi.mock("@raycast/api", async () => {
  const actual = await vi.importActual("@raycast/api");
  return {
    ...actual,
    List: vi.fn(({ isLoading, children }: { isLoading?: boolean; children?: React.ReactNode }) => (
      <div data-loading={isLoading}>{children}</div>
    )),
  };
});

vi.mock("../components", () => ({
  ErrorView: vi.fn(
    ({
      title,
      message,
      onRetry,
    }: {
      title: string;
      message: string;
      onRetry?: () => void;
      onRefreshSession?: () => void;
    }) => (
      <div data-testid="error-view" data-title={title} data-message={message}>
        {onRetry && <button onClick={onRetry}>Retry</button>}
      </div>
    ),
  ),
}));

const createMockSession = (overrides = {}) => ({
  isLoading: false,
  isConfigured: true,
  isLoggedOut: false,
  sessionToken: "test-token",
  userId: "test-user",
  privateKey: "test-key",
  error: undefined,
  refresh: vi.fn(),
  logout: vi.fn(),
  reconnect: vi.fn(),
  getRequestOptions: vi.fn(() => ({})),
  ...overrides,
});

const createMockAccountsResult = (overrides = {}) => ({
  accounts: undefined,
  isLoading: false,
  error: undefined,
  revalidate: vi.fn(),
  ...overrides,
});

describe("useCommandState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBunqSession).mockReturnValue(createMockSession());
    vi.mocked(useAccounts).mockReturnValue(createMockAccountsResult());
  });

  describe("isReady logic", () => {
    it("returns isReady true when not loading and no error", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ isLoading: false, error: undefined }));

      const { result } = renderHook(() => useCommandState());

      expect(result.current.isReady).toBe(true);
    });

    it("returns isReady false when loading", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ isLoading: true }));

      const { result } = renderHook(() => useCommandState());

      expect(result.current.isReady).toBe(false);
    });

    it("returns isReady false when there is an error", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ error: new Error("Test error") }));

      const { result } = renderHook(() => useCommandState());

      expect(result.current.isReady).toBe(false);
    });
  });

  describe("loading state", () => {
    it("returns loadingView when session is loading", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ isLoading: true }));

      const { result } = renderHook(() => useCommandState());

      expect(result.current.loadingView).not.toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    it("returns null loadingView when not loading", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ isLoading: false }));

      const { result } = renderHook(() => useCommandState());

      expect(result.current.loadingView).toBeNull();
    });
  });

  describe("error state", () => {
    it("returns errorView when session has error", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ error: new Error("Session error") }));

      const { result } = renderHook(() => useCommandState());

      expect(result.current.errorView).not.toBeNull();
    });

    it("returns null errorView when no error", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ error: undefined }));

      const { result } = renderHook(() => useCommandState());

      expect(result.current.errorView).toBeNull();
    });
  });

  describe("withAccounts option", () => {
    it("returns undefined accounts by default", () => {
      const { result } = renderHook(() => useCommandState());

      expect(result.current.accounts).toBeUndefined();
    });

    it("returns accounts when withAccounts is true", () => {
      const mockAccounts = [{ id: 1, description: "Test" }];
      vi.mocked(useAccounts).mockReturnValue(createMockAccountsResult({ accounts: mockAccounts }));

      const { result } = renderHook(() => useCommandState({ withAccounts: true }));

      expect(result.current.accounts).toEqual(mockAccounts);
    });

    it("includes account loading in isLoading when withAccounts is true", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ isLoading: false }));
      vi.mocked(useAccounts).mockReturnValue(createMockAccountsResult({ isLoading: true }));

      const { result } = renderHook(() => useCommandState({ withAccounts: true }));

      expect(result.current.isLoading).toBe(true);
    });

    it("does not include account loading when withAccounts is false", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ isLoading: false }));
      vi.mocked(useAccounts).mockReturnValue(createMockAccountsResult({ isLoading: true }));

      const { result } = renderHook(() => useCommandState({ withAccounts: false }));

      expect(result.current.isLoading).toBe(false);
    });

    it("includes account error when withAccounts is true", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ error: undefined }));
      vi.mocked(useAccounts).mockReturnValue(createMockAccountsResult({ error: new Error("Account error") }));

      const { result } = renderHook(() => useCommandState({ withAccounts: true }));

      expect(result.current.errorView).not.toBeNull();
    });

    it("does not include account error when withAccounts is false", () => {
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ error: undefined }));
      vi.mocked(useAccounts).mockReturnValue(createMockAccountsResult({ error: new Error("Account error") }));

      const { result } = renderHook(() => useCommandState({ withAccounts: false }));

      expect(result.current.errorView).toBeNull();
    });
  });

  describe("revalidate", () => {
    it("calls session refresh", () => {
      const refresh = vi.fn();
      vi.mocked(useBunqSession).mockReturnValue(createMockSession({ refresh }));

      const { result } = renderHook(() => useCommandState());

      result.current.revalidate();

      expect(refresh).toHaveBeenCalled();
    });

    it("calls revalidateAccounts when withAccounts is true", () => {
      const revalidateAccounts = vi.fn();
      vi.mocked(useAccounts).mockReturnValue(createMockAccountsResult({ revalidate: revalidateAccounts }));

      const { result } = renderHook(() => useCommandState({ withAccounts: true }));

      result.current.revalidate();

      expect(revalidateAccounts).toHaveBeenCalled();
    });

    it("does not call revalidateAccounts when withAccounts is false", () => {
      const revalidateAccounts = vi.fn();
      vi.mocked(useAccounts).mockReturnValue(createMockAccountsResult({ revalidate: revalidateAccounts }));

      const { result } = renderHook(() => useCommandState({ withAccounts: false }));

      result.current.revalidate();

      expect(revalidateAccounts).not.toHaveBeenCalled();
    });
  });
});
