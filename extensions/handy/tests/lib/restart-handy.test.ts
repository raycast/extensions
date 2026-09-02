import { describe, expect, it, vi, beforeEach } from "vitest";
import { Toast } from "@raycast/api";

const { applySettingsAndReloadMock } = vi.hoisted(() => ({
  applySettingsAndReloadMock: vi.fn(),
}));

vi.mock("../../src/lib/handy", () => ({
  applySettingsAndReload: applySettingsAndReloadMock,
}));

import { restartHandy, restartHandyAction } from "../../src/lib/restart-handy";

const BINARY_PATH = "/Applications/Handy.app/Contents/MacOS/Handy";

function makeToast(): Toast {
  return {
    style: Toast.Style.Failure,
    title: "",
    message: "previous message",
  } as unknown as Toast;
}

describe("restartHandy", () => {
  beforeEach(() => {
    applySettingsAndReloadMock.mockReset();
  });

  it("reports success on the toast", async () => {
    applySettingsAndReloadMock.mockResolvedValue(undefined);
    const apply = vi.fn();
    const toast = makeToast();

    await restartHandy(apply, BINARY_PATH, toast);

    expect(applySettingsAndReloadMock).toHaveBeenCalledWith(apply, BINARY_PATH);
    expect(toast.style).toBe(Toast.Style.Success);
    expect(toast.title).toBe("Handy restarted");
  });

  it("calls onApplied only after a successful restart", async () => {
    applySettingsAndReloadMock.mockResolvedValue(undefined);
    const onApplied = vi.fn();
    const toast = makeToast();

    await restartHandy(vi.fn(), BINARY_PATH, toast, onApplied);

    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it("does not mark the selection current when restart fails", async () => {
    applySettingsAndReloadMock.mockRejectedValue(
      new Error("Handy did not quit; restart canceled"),
    );
    const onApplied = vi.fn();
    const toast = makeToast();

    await restartHandy(vi.fn(), BINARY_PATH, toast, onApplied);

    expect(onApplied).not.toHaveBeenCalled();
    expect(toast.style).toBe(Toast.Style.Failure);
    expect(toast.title).toBe("Couldn't restart Handy");
    expect(toast.message).toBe("Handy did not quit; restart canceled");
  });

  it("action handles a rejected restart without an unhandled rejection", async () => {
    applySettingsAndReloadMock.mockRejectedValue(new Error("boom"));
    const toast = makeToast();
    const onRejection = vi.fn();
    process.once("unhandledRejection", onRejection);

    const action = restartHandyAction(vi.fn(), BINARY_PATH);
    expect(action.title).toBe("Restart Handy");
    action.onAction(toast);
    await new Promise((resolve) => setImmediate(resolve));

    expect(onRejection).not.toHaveBeenCalled();
    expect(toast.style).toBe(Toast.Style.Failure);
    process.off("unhandledRejection", onRejection);
  });
});
