import { describe, expect, it } from "vitest";
import { MACOS_FLOAT_PANEL_SCRIPT, WINDOWS_FLOAT_PANEL_SCRIPT } from "./floating-window";

describe("floating window automation", () => {
  it("uses Logos' documented macOS floating-panel shortcut", () => {
    expect(MACOS_FLOAT_PANEL_SCRIPT).toContain('tell application id "com.logos.desktop.logos" to activate');
    expect(MACOS_FLOAT_PANEL_SCRIPT).toContain('keystroke "f" using {command down, option down}');
  });

  it("uses Logos' documented Windows floating-panel shortcut", () => {
    expect(WINDOWS_FLOAT_PANEL_SCRIPT).toContain('Get-Process -Name "Logos"');
    expect(WINDOWS_FLOAT_PANEL_SCRIPT).toContain("$shell.SendKeys('^{F11}')");
  });
});
