import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { refreshSessionWithMutex, refreshSessionWithFallback, resetSessionManager } from "./session-manager";
import { BunqApiError } from "../api/client";

// Mock dependencies
vi.mock("../api/auth", () => ({
  refreshSession: vi.fn(),
  performFullSetup: vi.fn(),
}));

vi.mock("./storage", () => ({
  getSessionToken: vi.fn(() => Promise.resolve("session-token")),
  getUserId: vi.fn(() => Promise.resolve("user-123")),
  getAllCredentials: vi.fn(() =>
    Promise.resolve({
      sessionToken: "session-token",
      userId: "user-123",
      rsaPrivateKey: "private-key",
      rsaPublicKey: "public-key",
    }),
  ),
}));

vi.mock("./logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("session-manager", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset internal state
    resetSessionManager();

    // Setup default successful behavior
    const { refreshSession, performFullSetup } = await import("../api/auth");
    vi.mocked(refreshSession).mockResolvedValue(undefined);
    vi.mocked(performFullSetup).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("refreshSessionWithMutex", () => {
    it("refreshes session and returns credentials", async () => {
      const result = await refreshSessionWithMutex();

      expect(result).toEqual({
        sessionToken: "session-token",
        userId: "user-123",
        privateKey: "private-key",
      });
    });

    it("calls refreshSession from auth module", async () => {
      const { refreshSession } = await import("../api/auth");

      await refreshSessionWithMutex();

      expect(refreshSession).toHaveBeenCalled();
    });

    it("returns same promise for concurrent calls", async () => {
      const { refreshSession } = await import("../api/auth");

      // Create a promise that we control
      let resolveRefresh: () => void = () => {};
      const refreshPromise = new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
      vi.mocked(refreshSession).mockReturnValue(refreshPromise);

      // Reset the session manager to clear any previous state
      resetSessionManager();

      // Start two concurrent refresh calls
      const promise1 = refreshSessionWithMutex();
      const promise2 = refreshSessionWithMutex();

      // Both calls should return values from the same underlying refresh
      // (we can't compare promise identity due to async wrapper)
      // Instead, verify refreshSession was only called once
      expect(refreshSession).toHaveBeenCalledTimes(1);

      // Resolve the promise and await both
      resolveRefresh();
      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should get the same credentials
      expect(result1.sessionToken).toBe(result2.sessionToken);
    });

    it("prevents rapid refresh within minimum interval", async () => {
      vi.useFakeTimers();
      const { refreshSession } = await import("../api/auth");

      // First refresh
      await refreshSessionWithMutex();
      expect(refreshSession).toHaveBeenCalledTimes(1);

      // Second refresh immediately after (within MIN_REFRESH_INTERVAL_MS)
      await refreshSessionWithMutex();
      // Should not have called refresh again
      expect(refreshSession).toHaveBeenCalledTimes(1);
    });

    it("allows refresh after minimum interval", async () => {
      vi.useFakeTimers();
      const { refreshSession } = await import("../api/auth");

      // First refresh
      await refreshSessionWithMutex();
      expect(refreshSession).toHaveBeenCalledTimes(1);

      // Advance time beyond minimum interval
      vi.advanceTimersByTime(6000);

      // Second refresh should proceed
      await refreshSessionWithMutex();
      expect(refreshSession).toHaveBeenCalledTimes(2);
    });

    it("clears mutex after completion", async () => {
      const { refreshSession } = await import("../api/auth");

      await refreshSessionWithMutex();
      expect(refreshSession).toHaveBeenCalledTimes(1);

      // Manually reset for this test
      resetSessionManager();

      // Should be able to refresh again
      await refreshSessionWithMutex();
      expect(refreshSession).toHaveBeenCalledTimes(2);
    });

    it("clears mutex even on error", async () => {
      const { refreshSession } = await import("../api/auth");
      vi.mocked(refreshSession).mockRejectedValueOnce(new Error("Refresh failed"));

      await expect(refreshSessionWithMutex()).rejects.toThrow("Refresh failed");

      // Reset and retry
      resetSessionManager();
      vi.mocked(refreshSession).mockResolvedValueOnce(undefined);

      const result = await refreshSessionWithMutex();
      expect(result.sessionToken).toBe("session-token");
    });
  });

  describe("refreshSessionWithFallback", () => {
    it("returns credentials on successful refresh", async () => {
      const result = await refreshSessionWithFallback();

      expect(result).toEqual({
        sessionToken: "session-token",
        userId: "user-123",
        privateKey: "private-key",
      });
    });

    it("falls back to full setup on 401 error", async () => {
      const { refreshSession, performFullSetup } = await import("../api/auth");
      vi.mocked(refreshSession).mockRejectedValueOnce(new BunqApiError("Unauthorized", 401, []));

      const result = await refreshSessionWithFallback();

      expect(performFullSetup).toHaveBeenCalled();
      expect(result.sessionToken).toBe("session-token");
    });

    it("does not fall back for non-401 errors", async () => {
      const { refreshSession, performFullSetup } = await import("../api/auth");
      vi.mocked(refreshSession).mockRejectedValueOnce(new BunqApiError("Server error", 500, []));

      await expect(refreshSessionWithFallback()).rejects.toThrow("Server error");
      expect(performFullSetup).not.toHaveBeenCalled();
    });

    it("does not fall back for non-BunqApiError", async () => {
      const { refreshSession, performFullSetup } = await import("../api/auth");
      vi.mocked(refreshSession).mockRejectedValueOnce(new Error("Network error"));

      await expect(refreshSessionWithFallback()).rejects.toThrow("Network error");
      expect(performFullSetup).not.toHaveBeenCalled();
    });

    it("logs warning when falling back to full setup", async () => {
      const { logger } = await import("./logger");
      const { refreshSession } = await import("../api/auth");
      vi.mocked(refreshSession).mockRejectedValueOnce(new BunqApiError("Unauthorized", 401, []));

      await refreshSessionWithFallback();

      expect(logger.warn).toHaveBeenCalledWith("Session refresh failed with 401, attempting full setup");
    });
  });

  describe("resetSessionManager", () => {
    it("resets internal state", async () => {
      vi.useFakeTimers();
      const { refreshSession } = await import("../api/auth");

      // First refresh
      await refreshSessionWithMutex();

      // Reset state
      resetSessionManager();

      // Should allow immediate refresh
      await refreshSessionWithMutex();

      expect(refreshSession).toHaveBeenCalledTimes(2);
    });

    it("logs debug message", async () => {
      const { logger } = await import("./logger");

      resetSessionManager();

      expect(logger.debug).toHaveBeenCalledWith("Session manager state reset");
    });
  });
});
