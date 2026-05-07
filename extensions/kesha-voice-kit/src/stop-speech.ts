import { showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Stop any in-flight speech playback by killing every `afplay` process the
 *  current user owns. `Speak Clipboard` always plays through `/usr/bin/afplay`
 *  (see speak-clipboard.ts), so this is the canonical kill switch.
 *
 *  We use `pkill -u <uid> -x afplay` so we only target the current user's
 *  exact-name afplay processes — no global ripple, no killing unrelated
 *  helpers. `pkill` exits 1 when nothing matches; we treat that as "nothing
 *  to stop" rather than an error so the bind-to-hotkey path always feels
 *  immediate and consequence-free. */
export default async function Command() {
  try {
    await execFileAsync("/usr/bin/pkill", [
      "-u",
      String(process.getuid?.() ?? ""),
      "-x",
      "afplay",
    ]);
    await showHUD("⏹  Speech stopped");
  } catch (err: unknown) {
    // execFile rejection: child exited non-zero. The exit code lives on
    // `.code` as a number (Node child_process types). pkill exits 1 when
    // no matching processes exist — treat as success-shaped "nothing to do".
    const exitCode = (err as { code?: number } | undefined)?.code;
    if (exitCode === 1) {
      await showHUD("⏹  Nothing to stop");
      return;
    }
    console.error(`stop-speech failed: code=${exitCode ?? "?"}`);
    await showHUD("✗ Stop failed (see extension logs)");
  }
}
