import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useCachedState } from "@raycast/utils";
import { createMockPreferences } from "../test-utils";

// Mock dependencies
vi.mock("@raycast/utils", () => ({
  useCachedState: vi.fn(),
}));

vi.mock("../../utils/validation", () => ({
  getSafeValue: vi.fn((value: string | undefined, fallback: string) => value || fallback),
}));

vi.mock("../../hooks/useAgentConfig", () => ({
  useAgentConfig: vi.fn(() => ({
    config: {
      agentPath: "/usr/local/bin/claude",
      workingDir: "/Users/test/claude",
      expandedAgentPath: "/usr/local/bin/claude",
      isValid: true,
      errors: [],
      warnings: [],
    },
    expandPath: vi.fn((path: string) => path.replace(/^~/, "/Users/test")),
    getEnvironmentConfig: vi.fn(() => ({ NO_COLOR: "1", CI: "true" })),
  })),
}));

vi.mock("../../agents", () => ({
  getAgent: vi.fn((agentId: string) => ({
    id: agentId,
    name: agentId === "claude" ? "Claude Code" : agentId === "openai" ? "OpenAI CLI" : "Gemini CLI",
    models: {
      sonnet: { id: "sonnet", displayName: "Sonnet 4.0" },
      opus: { id: "opus", displayName: "Opus 4.1" },
      haiku: { id: "haiku", displayName: "Haiku 4.0" },
    },
    defaultModel: "sonnet",
  })),
}));

describe("useFormPersistence", () => {
  // Storage simulation
  let storage: Record<string, any> = {};
  const mockPreferences = createMockPreferences();

  beforeEach(() => {
    storage = {};

    // Mock useCachedState to simulate real persistence behavior using React's useState
    vi.mocked(useCachedState).mockImplementation((key: string, initialValue?: any) => {
      const [state, setState] = useState(storage[key] ?? initialValue);

      const setValue = (newValue: any) => {
        storage[key] = newValue;
        setState(newValue);
      };

      return [state, setValue];
    });
  });

  describe("Agent State Persistence", () => {
    it("persists and restores last agent selection", () => {
      const { result: firstHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      act(() => {
        firstHook.current.setLastAgent("openai");
      });

      // Create new hook instance to simulate restoration
      const { result: secondHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(secondHook.current.lastAgent).toBe("openai");
    });

    it("initializes lastAgent with default Claude", () => {
      const { result } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(result.current.lastAgent).toBe("claude");
    });

    it("setLastAgent function updates the cached state", () => {
      const { result } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      act(() => {
        result.current.setLastAgent("gemini");
      });

      expect(result.current.lastAgent).toBe("gemini");
    });
  });

  describe("Form State Persistence", () => {
    it("persists and restores last format selection", () => {
      const { result: firstHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      act(() => {
        firstHook.current.setLastTemplate("slack");
      });

      // Create new hook instance to simulate restoration
      const { result: secondHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(secondHook.current.lastTemplate).toBe("slack");
    });

    it("persists and restores last tone selection", () => {
      const { result: firstHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      act(() => {
        firstHook.current.setLastTone("professional");
      });

      const { result: secondHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(secondHook.current.lastTone).toBe("professional");
    });

    it("persists and restores last model selection", () => {
      const { result: firstHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      act(() => {
        firstHook.current.setLastModel("Opus");
      });

      // Create new hook instance to simulate restoration
      const { result: secondHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(secondHook.current.lastModel).toBe("Opus");
    });

    it("provides initial values for new sessions", () => {
      const { result } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(result.current.initialTemplate).toBeDefined();
      expect(result.current.initialTone).toBeDefined();
      expect(result.current.initialModel).toBeDefined();
      expect(result.current.initialTargetFolder).toBeDefined();
      expect(typeof result.current.initialTemplate).toBe("string");
      expect(typeof result.current.initialTone).toBe("string");
      expect(typeof result.current.initialModel).toBe("string");
      expect(typeof result.current.initialTargetFolder).toBe("string");
    });
  });

  describe("Model State Persistence", () => {
    it("initializes lastModel with empty string", () => {
      const { result } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(result.current.lastModel).toBe("");
    });

    it("setLastModel function updates the cached state", () => {
      const { result } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      act(() => {
        result.current.setLastModel("Haiku");
      });

      expect(result.current.lastModel).toBe("Haiku");
    });

    it("initialModel returns the correct value", () => {
      const { result } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(result.current.initialModel).toBe("Sonnet 4.0");

      act(() => {
        result.current.setLastModel("Opus 4.1");
      });

      // Create new hook instance to test initial value
      const { result: newHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));
      expect(newHook.current.initialModel).toBe("Opus 4.1");
    });

    it("model persistence across hook rerenders", () => {
      const { result: firstHook, rerender } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      act(() => {
        firstHook.current.setLastModel("Haiku 4.0");
      });

      rerender();

      expect(firstHook.current.lastModel).toBe("Haiku 4.0");
      expect(firstHook.current.initialModel).toBe("Haiku 4.0");
    });
  });

  describe("Target Folder State Persistence", () => {
    it("persists and restores last target folder selection", () => {
      const { result: firstHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      act(() => {
        firstHook.current.setLastTargetFolder("/custom/folder");
      });

      // Create new hook instance to simulate restoration
      const { result: secondHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(secondHook.current.lastTargetFolder).toBe("/custom/folder");
    });

    it("initializes lastTargetFolder with working directory from config", () => {
      const { result } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      expect(result.current.lastTargetFolder).toBe("/Users/test/claude");
    });

    it("setLastTargetFolder function updates the cached state", () => {
      const { result } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      act(() => {
        result.current.setLastTargetFolder("/new/target/folder");
      });

      expect(result.current.lastTargetFolder).toBe("/new/target/folder");
    });

    it("initialTargetFolder returns the correct value", () => {
      const { result } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));

      // Should start with working directory
      expect(result.current.initialTargetFolder).toBe("/Users/test/claude");

      act(() => {
        result.current.setLastTargetFolder("/updated/folder");
      });

      // Create new hook instance to test initial value
      const { result: newHook } = renderHook(() => useFormPersistence({ preferences: mockPreferences }));
      expect(newHook.current.initialTargetFolder).toBe("/updated/folder");
    });
  });
});
