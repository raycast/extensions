import { closeMainWindow, open, showHUD } from "@raycast/api";
import { Bonjour } from "bonjour-service";
import { execFile } from "child_process";

/**
 * Targets mirrored by the operating system itself rather than by RameCast: AirPlay on macOS
 * (closed, encrypted protocol) and Miracast on Windows. We list them and hand off to the OS picker.
 */
export interface SystemTarget {
  kind: "airplay" | "miracast";
  id: string;
  name: string;
  model: string;
}

/** AirPlay receivers (Apple TV, AirPlay 2 TVs). macOS only; resolves when the scan window ends. */
export function discoverAirPlay(onFound: (t: SystemTarget) => void, durationMs: number): Promise<void> {
  if (process.platform !== "darwin") return Promise.resolve();
  return new Promise((resolve) => {
    const bonjour = new Bonjour();
    const browser = bonjour.find({ type: "airplay" }, (service) => {
      const txt = (service.txt ?? {}) as Record<string, string>;
      onFound({
        kind: "airplay",
        id: txt.deviceid ?? service.name,
        name: service.name,
        model: txt.model ?? "AirPlay",
      });
    });
    const requery = setInterval(() => browser.update(), 1500);
    setTimeout(() => {
      clearInterval(requery);
      browser.stop();
      bonjour.destroy();
      resolve();
    }, durationMs);
  });
}

/** Windows always offers its built-in wireless display picker. */
export function systemTargets(): SystemTarget[] {
  return process.platform === "win32"
    ? [{ kind: "miracast", id: "miracast", name: "Wireless Display", model: "Miracast (Windows Cast panel)" }]
    : [];
}

// Presses Win+K, which opens the Windows "Cast" panel. There's no documented URI for it.
const WIN_K = [
  "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;",
  'public class K{[DllImport("user32.dll")]public static extern void keybd_event(byte b,byte s,uint f,UIntPtr e);}\';',
  "[K]::keybd_event(0x5B,0,0,[UIntPtr]::Zero);[K]::keybd_event(0x4B,0,0,[UIntPtr]::Zero);",
  "[K]::keybd_event(0x4B,0,2,[UIntPtr]::Zero);[K]::keybd_event(0x5B,0,2,[UIntPtr]::Zero)",
].join("");

export async function openSystemMirroring(target: SystemTarget): Promise<void> {
  await closeMainWindow();
  if (target.kind === "airplay") {
    // Displays settings lists AirPlay receivers under the "+" (Add Display) menu.
    await open("x-apple.systempreferences:com.apple.Displays-Settings.extension");
    await showHUD(`Choose “${target.name}” from the + menu in Displays settings`);
  } else {
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WIN_K], { windowsHide: true });
    await showHUD("Pick your wireless display in the Cast panel");
  }
}
