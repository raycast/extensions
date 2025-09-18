import React from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { ExtensionPreferences, FormValues } from "../types";
import { createFilePath } from "../utils/validation/file-system-validation";
import { Toast } from "@raycast/api";
import { PromptActionProvider } from "../contexts/PromptActionContext";

// Mock for agents module to prevent import issues during tests
vi.mock("@/agents", () => ({
  createParsingError: vi.fn(() => ({
    category: "parsing",
    title: "Parsing Error",
    message: "Failed to parse response",
    recoverable: true,
    suggestions: ["Try again", "Check input"],
  })),
  createUnknownError: vi.fn(() => ({
    category: "unknown",
    title: "Unknown Error",
    message: "An unknown error occurred",
    recoverable: false,
    suggestions: ["Try again", "Contact support"],
  })),
  getRecoveryActions: vi.fn(() => ["retry", "check_config"]),
  matchErrorPattern: vi.fn(() => null),
  showCategorizedErrorToast: vi.fn(),
  showRecoveryToast: vi.fn(),
  getAgent: vi.fn(() => ({
    id: "claude",
    name: "Claude Code",
    pathPreferenceKey: "claudePath",
    tokenPreferenceKey: "claudeToken",
    models: {
      sonnet: { id: "sonnet", displayName: "Sonnet 4.0" },
    },
    defaultModel: "sonnet",
    authEnvVar: "CLAUDE_CODE_OAUTH_TOKEN",
    buildCommand: vi.fn(() => "mocked-command"),
    validatePath: vi.fn(() => ({ valid: true })),
  })),
  AGENTS: {
    claude: {
      id: "claude",
      name: "Claude Code",
      models: { sonnet: { id: "sonnet", displayName: "Sonnet 4.0" } },
      defaultModel: "sonnet",
    },
    cursor: {
      id: "cursor",
      name: "Cursor Agent",
      models: {
        auto: { id: "auto", displayName: "Auto" },
        sonnet4: { id: "sonnet-4", displayName: "Claude 4 Sonnet" },
      },
      defaultModel: "auto",
    },
  },
  ERROR_PATTERNS: [],
}));

// Mock data factories
export const createMockPreferences = (overrides?: Partial<ExtensionPreferences>): ExtensionPreferences => ({
  selectedAgent: "claude",
  claudePath: createFilePath("/usr/local/bin/claude"),
  claudeToken: "sk-ant-oat01-test-token-for-testing",
  codexPath: "",
  codexToken: "",
  geminiPath: "",
  geminiToken: "",
  cursorPath: createFilePath("/usr/local/bin/cursor-agent"),
  cursorToken: "cursor-api-key-test-token",
  agentWorkingDir: createFilePath("~/.devprompt"),
  shellPath: createFilePath("/bin/sh"),
  ...overrides,
});

export const createMockFormValues = (overrides?: Partial<FormValues>): FormValues => ({
  selectedAgent: "claude",
  template: "slack",
  tone: "default",
  model: "Sonnet 4.0",
  textInput: "",
  additionalContext: "",
  targetFolder: "",
  ...overrides,
});

// KEEP: Essential type definitions for mock entities
interface MockCustomTemplate {
  id: string;
  name: string;
  sections: {
    instructions: string;
    tone?: string;
    context?: string;
    requirements?: string;
    output?: string;
  };
  icon?: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MockCustomTone {
  id: string;
  name: string;
  guidelines: string;
  icon?: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Creates a mock custom template for testing
 *
 * @param overrides - Partial properties to override defaults
 * @returns Mock custom template with test-friendly defaults
 *
 * @example
 * ```typescript
 * const template = createMockCustomTemplate({
 *   id: "slack",
 *   name: "Slack Template",
 *   isBuiltIn: true
 * });
 * ```
 */
export const createMockCustomTemplate = (overrides?: Partial<MockCustomTemplate>): MockCustomTemplate => ({
  id: "test-template",
  name: "Test Format",
  sections: {
    instructions: "Format: {text}",
  },
  icon: undefined,
  isBuiltIn: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

/**
 * Creates a mock custom tone for testing
 *
 * @param overrides - Partial properties to override defaults
 * @returns Mock custom tone with test-friendly defaults
 *
 * @example
 * ```typescript
 * const tone = createMockCustomTone({
 *   id: "professional",
 *   name: "Professional Tone",
 *   isBuiltIn: true
 * });
 * ```
 */
export const createMockCustomTone = (overrides?: Partial<MockCustomTone>): MockCustomTone => ({
  id: "test-tone",
  name: "Test Tone",
  guidelines: "Test guidelines",
  icon: undefined,
  isBuiltIn: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

// KEEP: Essential entity mock helper
export const createMockEntity = (overrides: { id: string; name: string; icon?: string }) => ({
  id: overrides.id,
  name: overrides.name,
  icon: overrides.icon,
});

/**
 * Test wrapper component that provides necessary context providers
 */
export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mock implementations for context providers
  const mockgetTemplateById = vi.fn((id: string) => {
    const templates = [
      {
        id: "slack",
        name: "Slack",
        sections: {
          instructions: "Format for Slack: {text}",
          // variantSeparator and includeSeparatorForSingle are now hardcoded as "---"
        },
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "email",
        name: "Email",
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "github-pr",
        name: "GitHub PR",
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    return templates.find((f) => f.id === id);
  });

  const mockGetToneById = vi.fn((id: string) => {
    const tones = [
      {
        id: "professional",
        name: "Professional",
        guidelines: "Be formal and professional",
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "casual",
        name: "Casual",
        guidelines: "Be casual and friendly",
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    return tones.find((t) => t.id === id);
  });

  return (
    <PromptActionProvider getToneById={mockGetToneById} getTemplateById={mockgetTemplateById} maxLength={1000}>
      {children}
    </PromptActionProvider>
  );
};

/**
 * Custom render function that includes necessary providers
 */
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return render(ui, {
    wrapper: TestWrapper,
    ...options,
  });
};

// Toast expectation helpers
export const expectSuccessToast = (title: string, message?: string) => ({
  style: Toast.Style.Success,
  title,
  ...(message !== undefined && { message }),
});

export const expectFailureToast = (title: string, message?: string) => ({
  style: Toast.Style.Failure,
  title,
  ...(message !== undefined && { message }),
});

export const expectAnimatedToast = (title: string, message?: string) => ({
  style: Toast.Style.Animated,
  title,
  ...(message !== undefined && { message }),
});
