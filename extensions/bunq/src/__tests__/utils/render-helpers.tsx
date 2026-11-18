/**
 * Render helpers for testing React components.
 * Provides wrapper utilities for common testing patterns.
 */

import React from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Mock session state for testing.
 */
export interface MockSessionState {
  isLoading: boolean;
  isConfigured: boolean;
  error: Error | null;
  userId: string | null;
  sessionToken: string | null;
  refresh: () => Promise<void>;
  getRequestOptions: () => {
    baseUrl: string;
    headers: Record<string, string>;
  };
}

/**
 * Creates a mock session state with defaults.
 */
export function createMockSession(overrides: Partial<MockSessionState> = {}): MockSessionState {
  return {
    isLoading: false,
    isConfigured: true,
    error: null,
    userId: "test-user-123",
    sessionToken: "test-session-token",
    refresh: vi.fn(() => Promise.resolve()),
    getRequestOptions: vi.fn(() => ({
      baseUrl: "https://api.sandbox.bunq.com/v1",
      headers: {
        "X-Bunq-Client-Authentication": "test-session-token",
      },
    })),
    ...overrides,
  };
}

/**
 * Creates a loading session state.
 */
export function createLoadingSession(): MockSessionState {
  return createMockSession({
    isLoading: true,
    isConfigured: false,
    userId: null,
    sessionToken: null,
  });
}

/**
 * Creates an error session state.
 */
export function createErrorSession(errorMessage: string = "Test error"): MockSessionState {
  return createMockSession({
    isLoading: false,
    isConfigured: false,
    error: new Error(errorMessage),
    userId: null,
    sessionToken: null,
  });
}

/**
 * Creates an unconfigured session state.
 */
export function createUnconfiguredSession(): MockSessionState {
  return createMockSession({
    isLoading: false,
    isConfigured: false,
    userId: null,
    sessionToken: null,
  });
}

/**
 * Provider wrapper for tests that need session context.
 * Note: This is a placeholder - actual SessionProvider implementation may vary.
 */
interface WrapperProps {
  children: React.ReactNode;
  session?: MockSessionState | undefined;
}

export function TestWrapper({ children }: WrapperProps): React.JSX.Element {
  return <>{children}</>;
}

/**
 * Custom render function that wraps components with necessary providers.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & {
    session?: MockSessionState;
  },
): RenderResult {
  const { session, ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper session={session}>{children}</TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Wait helper for async operations in tests.
 */
export async function waitForNextTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Helper to flush all pending promises.
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}
