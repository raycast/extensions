/**
 * Tests for useBunqSession hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBunqSession, withSessionRefresh, BunqSession } from "./useBunqSession";
import { hasCompletedSetup, getAllCredentials, clearAll, credentialsMatchPreferences } from "../lib/storage";
import { performFullSetup } from "../api/auth";
import { refreshSessionWithFallback, resetSessionManager } from "../lib/session-manager";
import { BunqApiError } from "../api/client";

vi.mock("../lib/storage");
vi.mock("../api/auth");
vi.mock("../lib/session-manager");
vi.mock("../lib/logger");

// Mock Raycast API
vi.mock("@raycast/api", async () => {
  const actual = await vi.importActual("@raycast/api");
  return {
    ...actual,
    showToast: vi.fn(() => Promise.resolve()),
    confirmAlert: vi.fn(() => Promise.resolve(true)),
    Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
    Alert: { ActionStyle: { Destructive: "destructive" } },
  };
});

describe("useBunqSession", () => {
  const mockCredentials = {
    sessionToken: "test-session-token",
    userId: "test-user-123",
    privateKey: "test-private-key",
    rsaPrivateKey: "test-rsa-private-key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initial loading", () => {
    it("starts in loading state", () => {
      vi.mocked(credentialsMatchPreferences).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useBunqSession());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isConfigured).toBe(false);
    });

    it("loads session when setup is complete", async () => {
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(true);
      vi.mocked(refreshSessionWithFallback).mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isConfigured).toBe(true);
      expect(result.current.sessionToken).toBe(mockCredentials.sessionToken);
      expect(result.current.userId).toBe(mockCredentials.userId);
      expect(refreshSessionWithFallback).toHaveBeenCalled();
    });

    it("performs full setup when not configured", async () => {
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(false);
      vi.mocked(performFullSetup).mockResolvedValue();
      vi.mocked(getAllCredentials).mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(performFullSetup).toHaveBeenCalled();
      expect(getAllCredentials).toHaveBeenCalled();
      expect(result.current.isConfigured).toBe(true);
    });

    it("handles error during session load", async () => {
      const testError = new Error("Connection failed");
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(true);
      vi.mocked(refreshSessionWithFallback).mockRejectedValue(testError);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.isConfigured).toBe(false);
    });

    it("clears credentials when preferences change", async () => {
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(false);
      vi.mocked(clearAll).mockResolvedValue();
      vi.mocked(hasCompletedSetup).mockResolvedValue(false);
      vi.mocked(performFullSetup).mockResolvedValue();
      vi.mocked(getAllCredentials).mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(clearAll).toHaveBeenCalled();
      expect(resetSessionManager).toHaveBeenCalled();
    });
  });

  describe("getRequestOptions", () => {
    it("returns options with auth token and private key", async () => {
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(true);
      vi.mocked(refreshSessionWithFallback).mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });

      const options = result.current.getRequestOptions();
      expect(options.authToken).toBe(mockCredentials.sessionToken);
      expect(options.privateKey).toBe(mockCredentials.privateKey);
    });

    it("returns empty options when not authenticated", () => {
      vi.mocked(credentialsMatchPreferences).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useBunqSession());

      const options = result.current.getRequestOptions();
      expect(options.authToken).toBeUndefined();
      expect(options.privateKey).toBeUndefined();
    });
  });

  describe("refresh", () => {
    it("refreshes session successfully", async () => {
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(true);
      vi.mocked(refreshSessionWithFallback).mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });

      vi.mocked(refreshSessionWithFallback).mockClear();
      const newCredentials = { ...mockCredentials, sessionToken: "new-token" };
      vi.mocked(refreshSessionWithFallback).mockResolvedValue(newCredentials);

      await act(async () => {
        await result.current.refresh();
      });

      expect(refreshSessionWithFallback).toHaveBeenCalled();
      expect(result.current.sessionToken).toBe("new-token");
    });

    it("handles refresh error", async () => {
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(true);
      vi.mocked(refreshSessionWithFallback).mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });

      vi.mocked(refreshSessionWithFallback).mockRejectedValue(new Error("Refresh failed"));

      // refresh() should throw the error
      await expect(
        act(async () => {
          await result.current.refresh();
        }),
      ).rejects.toThrow("Refresh failed");

      // After the error, loading should be complete
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("logout", () => {
    it("clears credentials when confirmed", async () => {
      const { confirmAlert } = await import("@raycast/api");
      vi.mocked(confirmAlert).mockResolvedValue(true);
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(true);
      vi.mocked(refreshSessionWithFallback).mockResolvedValue(mockCredentials);
      vi.mocked(clearAll).mockResolvedValue();

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(clearAll).toHaveBeenCalled();
      expect(resetSessionManager).toHaveBeenCalled();
      expect(result.current.isLoggedOut).toBe(true);
      expect(result.current.isConfigured).toBe(false);
      // Should NOT auto-reconnect
      expect(performFullSetup).not.toHaveBeenCalled();
    });

    it("does not logout when cancelled", async () => {
      const { confirmAlert } = await import("@raycast/api");
      vi.mocked(confirmAlert).mockResolvedValue(false);
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(true);
      vi.mocked(refreshSessionWithFallback).mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(clearAll).not.toHaveBeenCalled();
    });
  });

  describe("reconnect", () => {
    it("clears credentials and performs fresh setup when confirmed", async () => {
      const { confirmAlert } = await import("@raycast/api");
      vi.mocked(confirmAlert).mockResolvedValue(true);
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(true);
      vi.mocked(refreshSessionWithFallback).mockResolvedValue(mockCredentials);
      vi.mocked(clearAll).mockResolvedValue();
      vi.mocked(performFullSetup).mockResolvedValue();
      vi.mocked(getAllCredentials).mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });

      // Clear the mock to verify it's called during reconnect
      vi.mocked(performFullSetup).mockClear();

      await act(async () => {
        await result.current.reconnect();
      });

      expect(clearAll).toHaveBeenCalled();
      expect(resetSessionManager).toHaveBeenCalled();
      expect(performFullSetup).toHaveBeenCalled();
      expect(result.current.isConfigured).toBe(true);
    });

    it("does not reconnect when cancelled", async () => {
      const { confirmAlert } = await import("@raycast/api");
      vi.mocked(confirmAlert).mockResolvedValue(false);
      vi.mocked(credentialsMatchPreferences).mockResolvedValue(true);
      vi.mocked(hasCompletedSetup).mockResolvedValue(true);
      vi.mocked(refreshSessionWithFallback).mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useBunqSession());

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });

      await act(async () => {
        await result.current.reconnect();
      });

      expect(clearAll).not.toHaveBeenCalled();
    });
  });
});

describe("withSessionRefresh", () => {
  const createMockSession = (overrides: Partial<BunqSession> = {}): BunqSession => ({
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

  it("executes operation successfully", async () => {
    const session = createMockSession();
    const operation = vi.fn().mockResolvedValue("success");

    const result = await withSessionRefresh(session, operation);

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(session.refresh).not.toHaveBeenCalled();
  });

  it("refreshes and retries on 401 error", async () => {
    const session = createMockSession();
    const error401 = new BunqApiError("Unauthorized", 401, []);
    const operation = vi.fn().mockRejectedValueOnce(error401).mockResolvedValue("success after retry");

    const result = await withSessionRefresh(session, operation);

    expect(result).toBe("success after retry");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(session.refresh).toHaveBeenCalled();
  });

  it("rethrows non-401 errors", async () => {
    const session = createMockSession();
    const error500 = new BunqApiError("Server error", 500, []);
    const operation = vi.fn().mockRejectedValue(error500);

    await expect(withSessionRefresh(session, operation)).rejects.toThrow(error500);
    expect(session.refresh).not.toHaveBeenCalled();
  });

  it("rethrows non-BunqApiError errors", async () => {
    const session = createMockSession();
    const genericError = new Error("Generic error");
    const operation = vi.fn().mockRejectedValue(genericError);

    await expect(withSessionRefresh(session, operation)).rejects.toThrow("Generic error");
    expect(session.refresh).not.toHaveBeenCalled();
  });

  it("rethrows if retry also fails", async () => {
    const session = createMockSession();
    const error401 = new BunqApiError("Unauthorized", 401, []);
    const retryError = new Error("Retry also failed");
    const operation = vi.fn().mockRejectedValueOnce(error401).mockRejectedValue(retryError);

    await expect(withSessionRefresh(session, operation)).rejects.toThrow("Retry also failed");
    expect(session.refresh).toHaveBeenCalled();
  });
});
