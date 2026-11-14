import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleNativeJSONFallback } from "./nativeJSONFallback";

const mocks = vi.hoisted(() => ({ saveFallback: vi.fn(), showToast: vi.fn() }));
vi.mock("@raycast/api", () => ({
  showToast: mocks.showToast,
  Toast: { Style: { Success: "success", Failure: "failure" } },
}));
vi.mock("@/providers/profiles/repository", () => ({ fallbackAIProviderToPromptJSON: mocks.saveFallback }));

beforeEach(() => {
  mocks.saveFallback.mockReset();
  mocks.showToast.mockReset();
});

describe("native JSON fallback notifications", () => {
  it("keeps the saved capability update but suppresses a stale success toast after refresh", async () => {
    mocks.saveFallback.mockResolvedValue(true);
    const controller = new AbortController();
    let finishRefresh!: () => void;
    const refresh = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    const revalidate = vi.fn(() => refresh);
    const pending = handleNativeJSONFallback({ id: "provider", name: "Provider" }, revalidate, controller.signal);
    await vi.waitFor(() => expect(revalidate).toHaveBeenCalledOnce());
    controller.abort();
    finishRefresh();
    await pending;
    expect(mocks.saveFallback).toHaveBeenCalledWith("provider");
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it("suppresses a stale failure toast when saving rejects after cancellation", async () => {
    let failSave!: (error: Error) => void;
    mocks.saveFallback.mockReturnValue(
      new Promise((_, reject) => {
        failSave = reject;
      }),
    );
    const controller = new AbortController();
    const revalidate = vi.fn();
    const pending = handleNativeJSONFallback({ id: "provider", name: "Provider" }, revalidate, controller.signal);
    controller.abort();
    failSave(new Error("storage unavailable"));
    await pending;
    expect(revalidate).not.toHaveBeenCalled();
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it("reports a completed fallback for the current request", async () => {
    mocks.saveFallback.mockResolvedValue(true);
    const revalidate = vi.fn().mockResolvedValue(undefined);
    await handleNativeJSONFallback({ id: "provider", name: "Provider" }, revalidate, new AbortController().signal);
    expect(revalidate).toHaveBeenCalledOnce();
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ style: "success" }));
  });
});
