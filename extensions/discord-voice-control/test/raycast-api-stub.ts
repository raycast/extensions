/**
 * Vitest stub for `@raycast/api`. The real package only resolves inside the Raycast runtime, so
 * tests alias it here (see vitest.config.ts). Provide just enough surface for the modules under
 * test; individual tests can still `vi.mock("@raycast/api", ...)` to override.
 */

export const environment = {
  supportPath: "/tmp/discord-voice-control-test",
};

export function getPreferenceValues<T>(): T {
  return {} as T;
}

export async function showHUD(_message: string): Promise<void> {}

export async function showToast(_options: unknown): Promise<void> {}

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};
