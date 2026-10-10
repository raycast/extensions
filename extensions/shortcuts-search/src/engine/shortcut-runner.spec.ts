jest.mock("@raycast/utils", () => ({ runPowerShellScript: jest.fn() }));
import { execFile } from "node:child_process";
jest.mock("node:child_process", () => ({ execFile: jest.fn() }));
jest.mock("../load/platform", () => ({ getPlatform: () => "macos" }));
import { buildJxaScript, runShortcuts } from "./shortcut-runner";
import { parseDelay } from "./execution-target";
import { Modifiers } from "../model/internal/modifiers";
const target = { kind: "desktop" as const, bundleId: "com.apple.TextEdit" };
const sequence = [{ base: "c", modifiers: [Modifiers.command] }];
describe("shortcut execution", () => {
  it("defaults empty and whitespace-only delay preferences to zero", () => {
    expect(parseDelay("")).toBe(0);
    expect(parseDelay(" \t\n")).toBe(0);
  });
  it("activates the specified application and verifies focus before every chord", () => {
    const script = buildJxaScript(target, 0.2, sequence, { c: "8" });
    expect(script).toContain("targetApp.activate()");
    expect(script.indexOf("verify();")).toBeLessThan(script.indexOf("events.keyCode"));
    expect(script).not.toContain("doShellScript");
  });
  it("rejects unsupported modifiers, incomplete keys, and invalid delays before execution", () => {
    expect(() => buildJxaScript(target, NaN, sequence, { c: "8" })).toThrow("Delay");
    expect(() => buildJxaScript(target, 0, sequence, { c: "8garbage" })).toThrow("unsupported");
    expect(() => buildJxaScript(target, 0, [{ base: "c", modifiers: [Modifiers.win] }], { c: "8" })).toThrow(
      "unsupported"
    );
    expect(() => buildJxaScript({ kind: "desktop", bundleId: "x;touch /tmp/x" }, 0, sequence, { c: "8" })).toThrow(
      "target"
    );
  });
  it("verifies the captured page for browser execution", () => {
    const script = buildJxaScript(
      { kind: "browser", bundleId: "com.apple.Safari", hostname: "example.com", url: "https://example.com/one" },
      0,
      sequence,
      { c: "8" }
    );
    expect(script).toContain("url !== target.url");
  });
});

it("awaits native completion and reports a partial failure without retrying", async () => {
  const native = execFile as unknown as jest.Mock;
  native.mockReset();
  let complete!: (error: Error | null, stdout?: string, stderr?: string) => void;
  native.mockImplementation((_file, _args, _options, callback) => {
    complete = callback;
  });
  let settled = false;
  const pending = runShortcuts(target, 0, sequence, { c: "8" });
  const result = pending.then(
    () => {
      settled = true;
    },
    (error) => {
      settled = true;
      throw error;
    }
  );
  await Promise.resolve();
  expect(settled).toBe(false);
  complete(new Error("Permission denied after first chord"));
  await expect(result).rejects.toThrow("Earlier chords may have run");
  expect(native).toHaveBeenCalledTimes(1);
  expect(native.mock.calls[0][0]).toBe("/usr/bin/osascript");
});
