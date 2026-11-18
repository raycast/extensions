import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  environment: { isDevelopment: true },
}));

vi.mock("@raycast/api", () => ({ environment: mocks.environment }));

import { appendDebugLog } from "../lib/debug-log";

describe("debug logging", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("redacts sensitive and nested values in development", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await appendDebugLog("test", {
      query: "private search",
      endpoint: "https://auth.example/authorize?state=secret",
      accessToken: "token",
      items: ["signed-url", "result"],
      error: new Error("request included https://signed.example"),
      platform: "ios",
    });
    expect(info).toHaveBeenCalledWith("[Mobbin] test", {
      query: "[redacted]",
      endpoint: "[redacted]",
      accessToken: "[redacted]",
      items: "[array:2]",
      error: { name: "Error" },
      platform: "ios",
    });
  });

  it("does nothing in production", async () => {
    mocks.environment.isDevelopment = false;
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await appendDebugLog("test", { platform: "ios" });
    expect(info).not.toHaveBeenCalled();
    mocks.environment.isDevelopment = true;
  });
});
