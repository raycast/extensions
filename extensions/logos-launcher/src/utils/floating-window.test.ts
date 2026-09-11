import { describe, expect, it } from "vitest";
import {
  MACOS_FLOAT_PANEL_SCRIPT,
  WINDOWS_FLOAT_PANEL_SCRIPT,
  getMacOSFloatPanelScript,
  getWindowsFloatPanelScript,
} from "./floating-window";

describe("floating window automation", () => {
  it("uses Logos' documented macOS floating-panel shortcut", () => {
    expect(MACOS_FLOAT_PANEL_SCRIPT).toContain('tell application id "com.logos.desktop.logos" to activate');
    expect(MACOS_FLOAT_PANEL_SCRIPT).toContain('keystroke "f" using {command down, option down}');
  });

  it("uses Logos' documented Windows floating-panel shortcut", () => {
    expect(WINDOWS_FLOAT_PANEL_SCRIPT).toContain('Get-Process -Name "Logos"');
    expect(WINDOWS_FLOAT_PANEL_SCRIPT).toContain("$shell.SendKeys('^{F11}')");
  });

  it("gates shortcut delivery on tool panel readiness and errors on timeout", () => {
    const macScript = getMacOSFloatPanelScript("Atlas");
    expect(macScript).toContain('set targetTool to "Atlas"');
    expect(macScript).toContain("if frontmost and focused of w then");
    expect(macScript).not.toContain("set currentTitle");
    expect(macScript).toContain("if not panelReady then");
    expect(macScript).toContain('error "Timed out waiting for " & targetTool & " panel to become active in Logos."');
    expect(macScript).toContain('keystroke "f" using {command down, option down}');

    const winScript = getWindowsFloatPanelScript("Atlas");
    expect(winScript).toContain('$targetName = "Atlas"');
    expect(winScript).toContain("function Test-PanelOwnsFocus");
    expect(winScript).toContain("[System.Windows.Automation.Automation]::Compare($focused, $panel)");
    expect(winScript).toContain("Test-PanelOwnsFocus $elem");
    expect(winScript).not.toContain("MainWindowTitle");
    expect(winScript).not.toContain("$focused.Current.Name");
    expect(winScript).toContain("if (-not $panelReady)");
    expect(winScript).toContain('throw "Timed out waiting for $targetName panel to become active in Logos."');
    expect(winScript).toContain("$shell.SendKeys('^{F11}')");
  });
});
