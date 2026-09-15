import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchStorageCommand } from "../src/raycast/commands";

const toast = vi.hoisted(() => ({ show: vi.fn<(options: Toast.Options) => Promise<Toast>>() }));

vi.mock("@raycast/api", () => ({
  launchCommand: vi.fn(),
  showToast: toast.show,
  LaunchType: { UserInitiated: "userInitiated" },
  Toast: { Style: { Failure: "FAILURE" } },
}));

beforeEach(() => vi.clearAllMocks());

describe("launchStorageCommand", () => {
  it.each([
    ["run-storage-benchmark", "Run Storage Benchmark"],
    ["view-storage-history", "View Storage History"],
  ] as const)("handles a rejected launch of %s and allows retry", async (name, title) => {
    vi.mocked(launchCommand).mockRejectedValueOnce(new Error("Command is unavailable"));
    vi.mocked(launchCommand).mockResolvedValueOnce(undefined);

    await expect(launchStorageCommand(name)).resolves.toBeUndefined();

    expect(launchCommand).toHaveBeenCalledWith({ name, type: LaunchType.UserInitiated });
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: `Could Not Open ${title}`,
      message: expect.stringContaining(`“${title}” from Raycast’s main search`),
      primaryAction: { title: "Try Again", onAction: expect.any(Function) },
    });
    const toastOptions = toast.show.mock.calls[0][0];
    if (!toastOptions.primaryAction) throw new Error("Missing retry action");
    await toastOptions.primaryAction.onAction({} as Toast);
    expect(launchCommand).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it("does not show a failure toast after a successful launch", async () => {
    vi.mocked(launchCommand).mockResolvedValueOnce(undefined);
    await launchStorageCommand("view-storage-history");
    expect(showToast).not.toHaveBeenCalled();
  });
});
