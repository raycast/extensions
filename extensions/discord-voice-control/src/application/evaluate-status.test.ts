import { describe, expect, it } from "vitest";
import { evaluateStatus, type CapabilitySnapshot } from "./evaluate-status";

const READY: CapabilitySnapshot = {
  discordInstalled: true,
  discordRunning: true,
  accessibility: "granted",
  muteShortcut: "cmd+shift+m",
  deafenShortcut: "cmd+shift+d",
};

function evalWith(overrides: Partial<CapabilitySnapshot>) {
  return evaluateStatus({ ...READY, ...overrides });
}

describe("evaluateStatus", () => {
  it("reports ready (best-effort success) when everything is configured", () => {
    const { result } = evalWith({});
    expect(result.outcome).toBe("success");
    expect(result.reasonCode).toBe("statusReady");
    expect(result.message.toLowerCase()).toContain("best-effort");
    // readiness must NOT claim a confirmed state
    expect(result.message.toLowerCase()).not.toContain("muted");
  });

  it("flags not-installed only when also not running", () => {
    expect(evalWith({ discordInstalled: false, discordRunning: false }).result.reasonCode).toBe(
      "statusDiscordNotInstalled",
    );
    // running implies installed even if the install probe missed it
    expect(evalWith({ discordInstalled: false, discordRunning: true }).result.reasonCode).not.toBe(
      "statusDiscordNotInstalled",
    );
  });

  it("flags incomplete shortcut setup distinctly from runtime unavailability", () => {
    const { result } = evalWith({ muteShortcut: "not-a-combo" });
    expect(result.reasonCode).toBe("statusShortcutNotConfigured");
    expect(result.outcome).toBe("unavailable");
  });

  it("flags missing Accessibility as a failed/blocked state", () => {
    const { result } = evalWith({ accessibility: "missing" });
    expect(result.reasonCode).toBe("statusAccessibilityMissing");
    expect(result.outcome).toBe("failed");
  });

  it("flags Discord not running as unavailable", () => {
    const { result } = evalWith({ discordRunning: false });
    expect(result.reasonCode).toBe("statusDiscordNotRunning");
    expect(result.outcome).toBe("unavailable");
  });

  it("reports unknown when Accessibility cannot be verified", () => {
    const { result } = evalWith({ accessibility: "unknown" });
    expect(result.reasonCode).toBe("statusUnknown");
    expect(result.outcome).toBe("unknown");
  });

  it("prioritizes setup problems over runtime ones", () => {
    // shortcut misconfigured AND discord not running -> setup wins (more actionable/permanent)
    const { result } = evalWith({ muteShortcut: "bad", discordRunning: false });
    expect(result.reasonCode).toBe("statusShortcutNotConfigured");
  });

  it("exposes per-check booleans for the view", () => {
    const { checks } = evalWith({ accessibility: "unknown" });
    expect(checks.accessibilityGranted).toBe(false);
    expect(checks.accessibilityUnknown).toBe(true);
    expect(checks.shortcutsConfigured).toBe(true);
  });
});
