import { Clipboard } from "@raycast/api";
import { spawn } from "child_process";

export const CLIPBOARD_CLEAR_DELAY_SECONDS = 120;

// Each script snapshots the clipboard's change counter, waits, and clears the
// clipboard only if nothing was copied since — so it never wipes newer content.
const MACOS_CLEAR_SCRIPT = `
ObjC.import("AppKit");
function run(argv) {
  const pasteboard = $.NSPasteboard.generalPasteboard;
  const changeCount = pasteboard.changeCount;
  delay(Number(argv[0]));
  if (pasteboard.changeCount === changeCount) pasteboard.clearContents;
}`;

const WINDOWS_CLEAR_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -Namespace Vaultcast -Name Clipboard -MemberDefinition '[DllImport("user32.dll")] public static extern uint GetClipboardSequenceNumber();'
$sequence = [Vaultcast.Clipboard]::GetClipboardSequenceNumber()
Start-Sleep -Seconds ${CLIPBOARD_CLEAR_DELAY_SECONDS}
if ([Vaultcast.Clipboard]::GetClipboardSequenceNumber() -eq $sequence) { [System.Windows.Forms.Clipboard]::Clear() }`;

function clearCommand(): [string, string[]] {
  if (process.platform === "win32") {
    return ["powershell.exe", ["-NoProfile", "-NonInteractive", "-Sta", "-Command", WINDOWS_CLEAR_SCRIPT]];
  }

  return ["/usr/bin/osascript", ["-l", "JavaScript", "-e", MACOS_CLEAR_SCRIPT, String(CLIPBOARD_CLEAR_DELAY_SECONDS)]];
}

/**
 * Clears the clipboard after {@link CLIPBOARD_CLEAR_DELAY_SECONDS} unless it changed in the meantime.
 * Runs in a detached process so it survives Raycast unloading the extension.
 */
function scheduleClipboardClear(): Promise<void> {
  const [command, args] = clearCommand();

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("error", (error) => {
      reject(new Error(`Clipboard will not be cleared automatically: ${error.message}`));
    });
  });
}

/**
 * Puts a secret on the clipboard without recording it in clipboard history and schedules it to be cleared.
 */
export async function copySecret(value: string): Promise<void> {
  await Clipboard.copy(value, { concealed: true });
  await scheduleClipboardClear();
}

/**
 * Pastes a secret and schedules clearing it, in case it stays on the clipboard after pasting.
 */
export async function pasteSecret(value: string): Promise<void> {
  await Clipboard.paste(value);
  await scheduleClipboardClear();
}
