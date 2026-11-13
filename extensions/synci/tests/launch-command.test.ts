import { beforeEach, describe, expect, it, vi } from "vitest";
import { LaunchType } from "@raycast/api";

const mocks = vi.hoisted(() => ({
  launchCommand: vi.fn().mockResolvedValue(undefined),
  showFailureToast: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@raycast/api", () => ({
  launchCommand: mocks.launchCommand,
  LaunchType: { UserInitiated: "userInitiated" },
}));
vi.mock("@raycast/utils", () => ({ showFailureToast: mocks.showFailureToast }));

import { launchCommandWithFeedback } from "../src/lib/launch-command";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("command launch feedback", () => {
  it("preserves the selected account and waits for the command to open", async () => {
    let finish: () => void = () => {};
    mocks.launchCommand.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const options = { name: "check-balances", type: LaunchType.UserInitiated, context: { accountId: "42" } };
    let completed = false;
    const pending = launchCommandWithFeedback(options, "Could Not Open View Accounts").then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    expect(mocks.launchCommand).toHaveBeenCalledExactlyOnceWith(options);
    finish();
    await pending;
    expect(completed).toBe(true);
    expect(mocks.showFailureToast).not.toHaveBeenCalled();
  });

  it.each([
    ["check-balances", "Could Not Open View Accounts"],
    ["reconnect-synci", "Could Not Open Reconnect Synci"],
  ])("handles a disabled %s command without an unhandled rejection", async (name, title) => {
    const error = new Error("Command is disabled");
    mocks.launchCommand.mockRejectedValueOnce(error);

    await expect(launchCommandWithFeedback({ name, type: LaunchType.UserInitiated }, title)).resolves.toBeUndefined();

    expect(mocks.launchCommand).toHaveBeenCalledOnce();
    expect(mocks.showFailureToast).toHaveBeenCalledExactlyOnceWith(error, { title });
  });
});
