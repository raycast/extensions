jest.mock("node:child_process", () => ({ execFile: jest.fn() }));
jest.mock("@raycast/utils", () => ({ runPowerShellScript: jest.fn().mockResolvedValue("") }));
jest.mock("../load/platform", () => ({ getPlatform: jest.fn() }));
import { execFile } from "node:child_process";
import { runPowerShellScript } from "@raycast/utils";
import { getPlatform } from "../load/platform";
import { runShortcuts, validateSequence } from "./shortcut-runner";
import { Modifiers } from "../model/internal/modifiers";
it("dispatches Windows execution and validation, without invoking osascript", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  const sequence = [{ base: "left", modifiers: [Modifiers.win] }];
  expect(() => validateSequence(sequence, { left: "left" })).not.toThrow();
  await runShortcuts({ kind: "desktop", windowsProcessName: "Code" }, 0, sequence, { left: "left" });
  expect(runPowerShellScript).toHaveBeenCalledTimes(1);
  expect(execFile).not.toHaveBeenCalled();
});
it("rejects targets for the wrong platform before native execution", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  await expect(runShortcuts({ kind: "desktop", bundleId: "com.microsoft.VSCode" }, 0, [], {})).rejects.toThrow(
    "Windows"
  );
  jest.mocked(getPlatform).mockReturnValue("macos");
  await expect(runShortcuts({ kind: "desktop", windowsProcessName: "Code" }, 0, [], {})).rejects.toThrow("macOS");
  expect(execFile).not.toHaveBeenCalled();
  expect(runPowerShellScript).not.toHaveBeenCalled();
});
