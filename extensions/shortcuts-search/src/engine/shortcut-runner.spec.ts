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

it.each([
  ["Web page changed; remaining keys were cancelled", "Web page changed; remaining keys were cancelled"],
  [
    "Could not send chord 2; earlier chords may have run. Check Accessibility and Automation permissions.",
    "Could not send chord 2; earlier chords may have run. Check Accessibility and Automation permissions.",
  ],
  [
    "/tmp/private path leaked",
    "Shortcut execution stopped. Check the target and Accessibility/Automation permissions. Earlier chords may have run; retry manually.",
  ],
])("surfaces only known osascript failures: %s", async (stderr, expected) => {
  const native = execFile as unknown as jest.Mock;
  native.mockReset();
  native.mockImplementation((_file, _args, _options, callback) =>
    callback(
      Object.assign(
        new Error(
          `Command failed: /usr/bin/osascript -l JavaScript -e ${"Application did not become ready; no keys were sent"}`
        ),
        {
          stderr: `execution error: Error: ${stderr} (-2700)`,
        }
      )
    )
  );
  await expect(runShortcuts(target, 0, sequence, { c: "8" })).rejects.toThrow(new Error(expected));
});
