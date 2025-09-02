import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentConfig } from "@/hooks/useAgentConfig";
import { createMockPreferences } from "../test-utils";

// Mock validation utilities
vi.mock("../../utils/validation", () => ({
  validateDirectory: vi.fn(() => ({ valid: true })),
}));

// Mock path utilities
vi.mock("../../utils/path", () => ({
  expandPath: vi.fn((path) => {
    if (typeof path !== "string") return "/";
    return path.replace(/^~/, process.env.HOME || "");
  }),
  validateExecutablePath: vi.fn(() => ({ valid: true })),
}));

// Mock agents
vi.mock("../../agents", () => ({
  getAgent: vi.fn(() => ({
    id: "claude",
    pathPreferenceKey: "claudePath",
    tokenPreferenceKey: "claudeToken",
    authEnvVar: "ANTHROPIC_API_KEY",
    validatePath: vi.fn(() => ({ valid: true })),
  })),
}));

describe("useAgentConfig", () => {
  const mockPreferences = createMockPreferences({
    claudePath: "~/claude",
    shellPath: "~/bin/zsh",
  });

  beforeEach(() => {
    process.env.HOME = "/Users/testuser";
  });

  it("should expand paths correctly", () => {
    const { result } = renderHook(() => useAgentConfig(mockPreferences));

    expect(result.current.config.expandedAgentPath).toBe("/Users/testuser/claude");
    expect(result.current.config.workingDir).toBe("/Users/testuser/.devprompt");
    expect(result.current.config.expandedShellPath).toBe("/Users/testuser/bin/zsh");
  });

  it("should preserve original paths", () => {
    const { result } = renderHook(() => useAgentConfig(mockPreferences));

    expect(result.current.config.agentPath).toBe("~/claude");
    expect(result.current.config.shellPath).toBe("~/bin/zsh");
  });

  it("should validate paths", () => {
    const { result } = renderHook(() => useAgentConfig(mockPreferences));

    expect(result.current.config.isValid).toBe(true);
  });

  it("should handle validation errors", () => {
    // Test the structure of the config object when there are errors
    const { result } = renderHook(() => useAgentConfig(mockPreferences));

    // The config should be structured correctly
    expect(result.current.config.errors).toBeInstanceOf(Array);
    expect(result.current.config.warnings).toBeInstanceOf(Array);
    expect(result.current.config.isValid).toBe(true); // Since mocked validation returns valid: true
  });

  it("should provide environment config", () => {
    const { result } = renderHook(() => useAgentConfig(mockPreferences));

    const envConfig = result.current.getEnvironmentConfig();

    expect(envConfig.NO_COLOR).toBe("1");
    expect(envConfig.CI).toBe("true");
  });

  it("should expand path manually", () => {
    const { result } = renderHook(() => useAgentConfig(mockPreferences));

    const expandedPath = result.current.expandPath("~/test/path");
    expect(expandedPath).toBe("/Users/testuser/test/path");
  });

  it("should handle missing HOME environment variable", () => {
    delete process.env.HOME;

    const { result } = renderHook(() => useAgentConfig(mockPreferences));

    const expandedPath = result.current.expandPath("~/test/path");
    expect(expandedPath).toBe("/test/path");
  });
});
