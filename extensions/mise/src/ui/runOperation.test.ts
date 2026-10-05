import { describe, expect, it, vi } from "vitest";
import { defaultPreferences, mocks } from "../../test/raycast-api";
import * as exec from "../mise/exec";
import { addGlobally, remove, upgrade } from "../mise/operations";
import { runOperation } from "./runOperation";

const location = { path: "/bin/sh", env: { PATH: "/bin", MISE_YES: "1", NO_COLOR: "1" } } as const;

describe("runOperation", () => {
  it("reports through toasts and leaves the window alone by default", async () => {
    vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const onSuccess = vi.fn();
    expect(await runOperation(location, upgrade("jq"), onSuccess)).toEqual({ code: 0, stdout: "", stderr: "" });
    expect(mocks.closeMainWindow).not.toHaveBeenCalled();
    expect(mocks.showHUD).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ style: "success", title: "jq upgraded" }),
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("closes the window first and ends with a HUD when closeAfterAction is on", async () => {
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, closeAfterAction: true });
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    expect(await runOperation(location, upgrade("jq"))).toMatchObject({ code: 0 });
    expect(mocks.closeMainWindow).toHaveBeenCalledWith({ clearRootSearch: false });
    expect(mocks.closeMainWindow.mock.invocationCallOrder[0]).toBeLessThan(runMise.mock.invocationCallOrder[0]);
    expect(mocks.showHUD).toHaveBeenCalledWith("jq upgraded");
    expect(mocks.showToast).toHaveBeenCalledOnce();
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ style: "animated" }));

    vi.mocked(runMise).mockResolvedValue({ code: 1, stdout: "", stderr: "mise ERROR no such tool" });
    expect(await runOperation(location, upgrade("jq"))).toMatchObject({ code: 1 });
    expect(mocks.showHUD).toHaveBeenLastCalledWith("Upgrading jq failed");
  });

  it("runs a multi-step operation in order and reports success once the last step exits 0", async () => {
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const onSuccess = vi.fn();
    expect(await runOperation(location, remove("jq"), onSuccess)).toMatchObject({ code: 0 });
    expect(runMise.mock.calls.map((call) => call[1])).toEqual([
      ["unuse", "jq"],
      ["uninstall", "--all", "jq"],
    ]);
    expect(mocks.showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ style: "success", title: "jq removed" }),
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("stops a multi-step operation at the first non-zero exit and reports that step's stderr", async () => {
    const runMise = vi
      .spyOn(exec, "runMise")
      .mockResolvedValueOnce({ code: 1, stdout: "", stderr: "mise ERROR jq is not in any config" });
    const onSuccess = vi.fn();
    expect(await runOperation(location, remove("jq"), onSuccess)).toMatchObject({ code: 1 });
    expect(runMise).toHaveBeenCalledOnce();
    expect(mocks.showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Removing jq failed",
        message: "jq is not in any config",
      }),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("keeps the failure toast with Copy Logs when the window stays open", async () => {
    vi.spyOn(exec, "runMise").mockResolvedValue({ code: 1, stdout: "", stderr: "first line\nmise ERROR no such tool" });
    expect(await runOperation(location, upgrade("jq"))).toMatchObject({
      code: 1,
      stderr: expect.stringContaining("no such tool"),
    });
    expect(mocks.showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Upgrading jq failed",
        message: "no such tool",
        primaryAction: expect.objectContaining({ title: "Copy Logs" }),
      }),
    );
  });

  it("puts the operation's retry first on the failure toast and runs it", async () => {
    const stderr = "mise ERROR Failed\n  help: set `allow_low_downloads = true` on `npm:agent-peek`";
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 1, stdout: "", stderr });
    await runOperation(location, addGlobally("npm:agent-peek"));
    const toast = mocks.showToast.mock.lastCall?.[0] as { primaryAction: { onAction: () => Promise<void> } };
    expect(toast).toMatchObject({
      style: "failure",
      primaryAction: expect.objectContaining({ title: "Allow Low Downloads and Retry" }),
      secondaryAction: expect.objectContaining({ title: "Copy Logs" }),
    });
    runMise.mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    await toast.primaryAction.onAction();
    await vi.waitFor(() =>
      expect(runMise).toHaveBeenLastCalledWith(
        location,
        ["use", "-g", "--tool-option", "allow_low_downloads=true", "npm:agent-peek@latest"],
        expect.anything(),
      ),
    );
  });
});
