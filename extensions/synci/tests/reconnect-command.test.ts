import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reconnect: vi.fn<() => Promise<string>>(),
  popToRoot: vi.fn().mockResolvedValue(undefined),
  showToast: vi.fn().mockResolvedValue(undefined),
  launchCommand: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@raycast/api", () => ({
  popToRoot: mocks.popToRoot,
  showToast: mocks.showToast,
  launchCommand: mocks.launchCommand,
  LaunchType: { UserInitiated: "userInitiated" },
  Toast: { Style: { Success: "success", Failure: "failure" } },
}));
vi.mock("../src/lib/auth", () => ({ session: { reconnect: mocks.reconnect } }));

import ReconnectSynci from "../src/reconnect-synci";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Reconnect Synci navigation", () => {
  it("waits for authorization, then clears the stack and shows completion without reopening consent", async () => {
    let finish: (token: string) => void = () => {};
    mocks.reconnect.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const command = ReconnectSynci();
    expect(mocks.popToRoot).not.toHaveBeenCalled();
    finish("synthetic-token");
    await command;
    expect(mocks.reconnect).toHaveBeenCalledOnce();
    expect(mocks.popToRoot).toHaveBeenCalledExactlyOnceWith({ clearSearchBar: true });
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ style: "success" }));
    expect(mocks.showToast.mock.invocationCallOrder[0]).toBeLessThan(mocks.popToRoot.mock.invocationCallOrder[0]);
    expect(mocks.launchCommand).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.showToast.mock.calls)).not.toContain("synthetic-token");
  });

  it("leaves the flow on cancellation and retries only when explicitly requested", async () => {
    mocks.reconnect.mockRejectedValue(new Error("Authorization canceled"));
    await ReconnectSynci();
    expect(mocks.popToRoot).toHaveBeenCalledExactlyOnceWith({ clearSearchBar: true });
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ style: "failure" }));
    expect(mocks.launchCommand).not.toHaveBeenCalled();
    await mocks.showToast.mock.calls[0][0].primaryAction.onAction();
    expect(mocks.launchCommand).toHaveBeenCalledExactlyOnceWith({ name: "reconnect-synci", type: "userInitiated" });
  });
});
