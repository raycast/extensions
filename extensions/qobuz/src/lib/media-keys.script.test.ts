import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { SCRIPT, buildScriptArgs } from "./media-keys";

const exec = promisify(execFile);

// NX_KEYTYPE_NUM_LOCK: a real system-defined key event that no Mac acts on,
// so the script can run for real without touching playback.
const HARMLESS_KEY_CODE = 10;

describe("media key script", () => {
  it("is valid JavaScript defining run(argv)", () => {
    const defineRun = new Function(`${SCRIPT}; return run;`);
    expect(typeof defineRun()).toBe("function");
  });

  it("rebuilds the event from serialised data and posts it to the HID tap", () => {
    expect(SCRIPT).toContain("$.CGEventCreateFromData(null, data)");
    expect(SCRIPT).toContain("$.CGEventPost($.kCGHIDEventTap, event)");
    expect(SCRIPT).not.toContain("ev.CGEvent");
  });

  // Runs the real script through osascript. Without Accessibility the script
  // still has to load the frameworks and reach the trust check, so the only
  // acceptable failure is `not-trusted`; anything else means it is broken.
  it.runIf(process.platform === "darwin")("runs under osascript and reaches the event APIs", async () => {
    try {
      await exec("osascript", ["-l", "JavaScript", "-e", SCRIPT, ...buildScriptArgs(HARMLESS_KEY_CODE)]);
    } catch (error) {
      expect((error as { stderr?: string }).stderr ?? "").toContain("not-trusted");
    }
  });
});
