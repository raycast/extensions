import { spawn } from "node:child_process";
import { join } from "node:path";
import { environment, open } from "@raycast/api";

/** Fire-and-forget play of a bundled sound file. Detached so it survives command exit. */
function playFile(fileName: string): void {
  const file = join(environment.assetsPath, fileName);

  const [command, args] =
    process.platform === "win32"
      ? ["powershell", ["-NoProfile", "-c", `(New-Object Media.SoundPlayer '${file}').PlaySync()`]]
      : ["afplay", [file]];

  try {
    const child = spawn(command, args as string[], { detached: true, stdio: "ignore" });
    child.on("error", () => {
      // No player available — silently skip.
    });
    child.unref();
  } catch {
    // Cosmetic only.
  }
}

/** Crowd roar — played when the user logs a glass of water. */
export function playCheer(): void {
  playFile("cheer.wav");
}

/** Referee whistle — played when a hydration break begins. */
export function playWhistle(): void {
  playFile("whistle.wav");
}

/** Screen-wide confetti via Raycast's built-in animation. */
export async function popConfetti(): Promise<void> {
  try {
    await open("raycast://confetti");
  } catch {
    // Confetti is a flourish — never block the celebration.
  }
}

/** Best-effort native system notification banner. macOS only; no-op elsewhere. */
export function showSystemNotification(title: string, message: string): void {
  if (process.platform !== "darwin") return;
  const escape = (s: string) => s.replace(/"/g, '\\"');
  const script = `display notification "${escape(message)}" with title "${escape(title)}"`;

  try {
    const child = spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" });
    child.on("error", () => {
      // osascript unavailable — skip.
    });
    child.unref();
  } catch {
    // Cosmetic only.
  }
}
