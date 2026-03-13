import { showToast, Toast } from "@raycast/api";
import { spawn } from "child_process";
import { AtomicShortcut } from "../model/internal/internal-models";
import { KeyCodes } from "../load/key-codes-provider";
import { getPlatform } from "../load/platform";

interface Chord {
  keyCode: number;
  modifiers: string[];
}

function buildJxaScript(bundleId: string, delaySeconds: number, chords: Chord[]): string {
  const bundleIdLiteral = JSON.stringify(bundleId);
  const chordsLiteral = JSON.stringify(chords);

  // language=JavaScript
  return `(function() {
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const systemEvents = Application("System Events");
    const bundleId = ${bundleIdLiteral};
    if (bundleId && systemEvents.applicationProcesses.whose({ bundleIdentifier: bundleId }).length > 0) {
      app.doShellScript("open -b " + bundleId);
      delay(${delaySeconds});
    }
    ${chordsLiteral}.forEach(function(chord) {
      systemEvents.keyCode(chord.keyCode, { using: chord.modifiers });
    });
  })();`;
}

export async function runShortcuts(
  bundleId: string | undefined,
  delaySeconds: number,
  sequence: AtomicShortcut[],
  keyCodes: KeyCodes
): Promise<void> {
  if (getPlatform() !== "macos") {
    await showToast({ style: Toast.Style.Failure, title: "Shortcut execution is only supported on macOS" });
    return;
  }

  const chords: Chord[] = sequence.map((atomic) => ({
    keyCode: parseInt(keyCodes[atomic.base], 10),
    modifiers: atomic.modifiers,
  }));

  const script = buildJxaScript(bundleId ?? "", delaySeconds, chords);

  spawn("osascript", ["-l", "JavaScript", "-e", script], {
    detached: true,
    stdio: "ignore",
  }).unref();
}
