import { say } from "native-say";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { playTTS } from "./tts";

vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false },
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure" } },
}));

vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));

vi.mock("native-say", () => ({
  getVoices: vi.fn().mockResolvedValue([]),
  killRunningSay: vi.fn().mockResolvedValue(undefined),
  say: vi.fn().mockResolvedValue(undefined),
}));

const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(process, "platform", { value: "darwin" });
});

afterEach(() => {
  if (originalPlatform) {
    Object.defineProperty(process, "platform", originalPlatform);
  }
});

describe("playTTS", () => {
  it.each([
    { scenario: "short text", text: "  hello  ", spoken: "hello" },
    { scenario: "exactly 40 characters", text: `  ${"a".repeat(40)}  `, spoken: "a".repeat(40) },
    { scenario: "more than 40 characters", text: `  ${"a".repeat(41)}  `, spoken: "a".repeat(40) + "..." },
  ])("trims $scenario and adds an ellipsis only when truncated", async ({ text, spoken }) => {
    await playTTS(text, "en");

    expect(say).toHaveBeenCalledExactlyOnceWith(spoken, { voice: undefined, skipRunningCheck: true });
  });
});
