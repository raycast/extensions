import { vi } from "vitest";

interface DeeplinkParams {
  command: string;
  context?: Record<string, unknown>;
}

export const createDeeplink = vi.fn((params: DeeplinkParams) => {
  return `raycast://deeplink?command=${params.command}&context=${JSON.stringify(params.context)}`;
});

export const showFailureToast = vi.fn();
