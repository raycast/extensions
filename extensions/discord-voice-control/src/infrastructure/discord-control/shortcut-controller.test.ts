import { describe, expect, it, vi } from "vitest";
import type { OsascriptResult } from "../system/osascript";
import { buildDispatchScript, ShortcutController, type ShortcutControllerDeps } from "./shortcut-controller";
import { parseShortcut } from "../system/shortcut-parser";

function ok(stdout = ""): OsascriptResult {
  return { ok: true, stdout, stderr: "", timedOut: false };
}
function err(stderr: string, timedOut = false): OsascriptResult {
  return { ok: false, stdout: "", stderr, timedOut };
}

type RunOsascript = ShortcutControllerDeps["runOsascript"];

/** A typed osascript mock so `.mock.calls[i][0]` is the `lines` argument. */
function mockRun(impl: RunOsascript = async () => ok()) {
  return vi.fn<RunOsascript>(impl);
}

function makeDeps(overrides: Partial<ShortcutControllerDeps> = {}): ShortcutControllerDeps {
  return {
    getShortcut: () => "cmd+shift+m",
    isDiscordRunning: async () => true,
    runOsascript: mockRun(),
    getFrontmostApp: async () => "Safari",
    ...overrides,
  };
}

describe("ShortcutController.perform", () => {
  it("reports best-effort success on a no-error dispatch (sent, not a confirmed state)", async () => {
    const controller = new ShortcutController(makeDeps());
    const result = await controller.perform("toggleMute");
    expect(result.outcome).toBe("success");
    expect(result.mechanism).toBe("shortcut");
    expect(result.reasonCode).toBe("shortcutDispatched");
    expect(result.message.toLowerCase()).toContain("sent");
    expect(result.message.toLowerCase()).not.toContain("muted");
  });

  it("returns unavailable BEFORE dispatch when Discord is not running", async () => {
    const runOsascript = vi.fn(async () => ok());
    const controller = new ShortcutController(makeDeps({ isDiscordRunning: async () => false, runOsascript }));
    const result = await controller.perform("toggleMute");
    expect(result.outcome).toBe("unavailable");
    expect(result.reasonCode).toBe("discordNotRunning");
    expect(runOsascript).not.toHaveBeenCalled();
  });

  it("returns unavailable when the shortcut does not parse", async () => {
    const runOsascript = vi.fn(async () => ok());
    const controller = new ShortcutController(makeDeps({ getShortcut: () => "totally-invalid", runOsascript }));
    const result = await controller.perform("toggleDeafen");
    expect(result.outcome).toBe("unavailable");
    expect(result.reasonCode).toBe("shortcutNotConfigured");
    expect(runOsascript).not.toHaveBeenCalled();
  });

  it("maps a permission error to a failed accessibility result", async () => {
    const controller = new ShortcutController(
      makeDeps({ runOsascript: vi.fn(async () => err("not allowed assistive access (-1719)")) }),
    );
    const result = await controller.perform("toggleMute");
    expect(result.outcome).toBe("failed");
    expect(result.reasonCode).toBe("accessibilityPermissionMissing");
    expect(result.diagnostics?.errorCategory).toBe("missingPermission");
  });

  it("maps a timeout to a failed timeout result", async () => {
    const controller = new ShortcutController(makeDeps({ runOsascript: vi.fn(async () => err("", true)) }));
    const result = await controller.perform("toggleMute");
    expect(result.outcome).toBe("failed");
    expect(result.reasonCode).toBe("dispatchTimedOut");
  });

  it("maps a generic osascript error to a failed dispatch result", async () => {
    const controller = new ShortcutController(
      makeDeps({ runOsascript: vi.fn(async () => err("Discord got an error")) }),
    );
    const result = await controller.perform("toggleMute");
    expect(result.outcome).toBe("failed");
    expect(result.reasonCode).toBe("dispatchError");
  });

  it("dispatches exactly once (no uncontrolled retries) and restores focus", async () => {
    const runOsascript = mockRun();
    const controller = new ShortcutController(makeDeps({ runOsascript, getFrontmostApp: async () => "Safari" }));
    await controller.perform("toggleMute");
    const calls = runOsascript.mock.calls.map((c) => c[0]);
    // one dispatch call (the multi-line activate+keystroke) + one restore call
    const dispatchCalls = calls.filter((lines) => lines.some((l) => l.includes("keystroke")));
    const restoreCalls = calls.filter((lines) => lines.some((l) => l.includes('"Safari" to activate')));
    expect(dispatchCalls).toHaveLength(1);
    expect(restoreCalls).toHaveLength(1);
  });

  it("does not issue a restore call when the previous app was Discord itself", async () => {
    const runOsascript = mockRun();
    const controller = new ShortcutController(makeDeps({ runOsascript, getFrontmostApp: async () => "Discord" }));
    await controller.perform("toggleMute");
    const calls = runOsascript.mock.calls.map((c) => c[0]);
    const restoreCalls = calls.filter((lines) =>
      lines.some((l) => l.includes("to activate") && !l.includes("Discord")),
    );
    expect(restoreCalls).toHaveLength(0);
  });
});

describe("buildDispatchScript", () => {
  it("activates Discord then sends the keystroke with modifiers", () => {
    const parsed = parseShortcut("cmd+shift+m");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const script = buildDispatchScript(parsed.shortcut);
    expect(script[0]).toContain('"Discord" to activate');
    expect(script.some((l) => l.includes('keystroke "m" using {command down, shift down}'))).toBe(true);
  });
});
