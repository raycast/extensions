import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentErrorHandling } from "@/hooks/useAgentErrorHandling";
import { showToast } from "@raycast/api";

vi.mock("@raycast/api");

const mockShowToast = vi.mocked(showToast);

describe("useAgentErrorHandling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("categorizes and handles timeout errors", () => {
    const { result } = renderHook(() => useAgentErrorHandling());

    const timeoutError = new Error("Request timed out");
    result.current.handleError(timeoutError);

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: expect.stringContaining("Timeout"),
      })
    );
  });

  it("categorizes and handles configuration errors", () => {
    const { result } = renderHook(() => useAgentErrorHandling());

    const notFoundError = new Error("command not found");
    result.current.handleError(notFoundError);

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: expect.stringContaining("Configuration"),
      })
    );
  });

  it("categorizes and handles authentication errors", () => {
    const { result } = renderHook(() => useAgentErrorHandling());

    const authError = new Error("Authentication failed");
    result.current.handleError(authError, { operation: "execution" });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: expect.stringContaining("Authentication"),
      })
    );
  });

  it("determines error recoverability correctly", () => {
    const { result } = renderHook(() => useAgentErrorHandling());

    const recoverableError = {
      category: "timeout" as const,
      title: "Timeout Error",
      message: "Operation timed out",
      originalMessage: "Original timeout message",
      recoverable: true,
    };

    const canRecover = result.current.recoverFromError(recoverableError);

    expect(canRecover).toBe(true);
    expect(mockShowToast).toHaveBeenCalled();
  });

  it("handles parsing errors with proper context", () => {
    const { result } = renderHook(() => useAgentErrorHandling());

    const parseError = new Error("Invalid JSON");
    result.current.handleError(parseError, { operation: "parsing" });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
      })
    );
  });

  it("provides recovery actions for different error types", () => {
    const { result } = renderHook(() => useAgentErrorHandling());

    const error = {
      category: "authentication" as const,
      title: "Auth Error",
      message: "Authentication failed",
      originalMessage: "Original auth message",
      recoverable: true,
    };

    const actions = result.current.getRecoveryActions(error);

    expect(Array.isArray(actions)).toBe(true);
  });
});
