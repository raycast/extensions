import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentRunner } from "@/hooks/useAgentRunner";
import { createMockPreferences, TestWrapper } from "@/__tests__/test-utils";
import { useExec } from "@raycast/utils";

// Performance: Use vi.hoisted() for expensive mock setup
const { mockUseExec, mockGetEnvironmentConfig } = vi.hoisted(() => {
  return {
    mockUseExec: vi.fn(),
    mockGetEnvironmentConfig: vi.fn(() => ({})),
  };
});

// Performance: Heavy mocks moved to vi.hoisted() for better performance
vi.mock("@raycast/utils", () => ({
  useExec: mockUseExec,
}));

vi.mock("@/hooks/useAgentConfig", () => ({
  useAgentConfig: () => ({
    config: {
      expandedShellPath: "/bin/bash",
      expandedAgentPath: "/usr/local/bin/claude",
      workingDir: "/tmp",
      isValid: true,
    },
    getEnvironmentConfig: mockGetEnvironmentConfig,
  }),
}));

describe("useAgentRunner", () => {
  const mockPreferences = createMockPreferences({ selectedAgent: "claude" });

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseExec.mockReturnValue({
      isLoading: false,
      data: null,
      error: undefined,
      revalidate: vi.fn(),
      mutate: vi.fn(),
    } as any);
  });

  it("exposes error state when agent execution fails", () => {
    const executionError = new Error("Agent execution failed");

    mockUseExec.mockReturnValue({
      isLoading: false,
      data: null,
      error: executionError as any,
      revalidate: vi.fn(),
      mutate: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAgentRunner("claude", mockPreferences, null), {
      wrapper: TestWrapper,
    });

    expect(result.current.executionError).toBe(executionError);
    expect(result.current.executionData).toBe("");
  });

  it("reflects loading state during execution", () => {
    vi.mocked(useExec).mockReturnValue({
      isLoading: true,
      data: null,
      error: undefined,
      revalidate: vi.fn(),
      mutate: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAgentRunner("claude", mockPreferences, null), {
      wrapper: TestWrapper,
    });

    expect(result.current.isExecuting).toBe(true);
    expect(result.current.executionData).toBeNull();
    expect(result.current.executionError).toBeNull();
  });
});
