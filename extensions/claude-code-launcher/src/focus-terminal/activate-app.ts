import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Bring the app instance owning the pid to the front via NSRunningApplication.
// Unlike System Events' frontmost, this is a real activation that switches Spaces
// (including into fullscreen ones) and targets the exact instance when several
// share a bundle (Alacritty, Ghostty in window mode). For a single instance with
// several windows, macOS activates its most-recently-focused window. Throws when
// the pid does not belong to a GUI process (e.g. a session inside tmux or over ssh).
export async function activateProcess(pid: number): Promise<void> {
  const script = `
    ObjC.import("AppKit");
    function run(argv) {
      const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(parseInt(argv[0], 10));
      if (app.isNil()) throw new Error("no GUI app with pid " + argv[0]);
      app.activateWithOptions($.NSApplicationActivateIgnoringOtherApps);
    }
  `;
  await execFileAsync("osascript", ["-l", "JavaScript", "-e", script, String(pid)]);
}

// App-level activation via LaunchServices (same as a Dock-icon click).
export async function openAppBundle(bundlePath: string): Promise<void> {
  await execFileAsync("open", [bundlePath]);
}
