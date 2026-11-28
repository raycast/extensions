import { showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { preparePlayer } from "./player";
import { join } from "node:path";
import { promisify } from "node:util";

export async function control(action: "toggle" | "faster" | "slower") {
  try {
    const app = await preparePlayer();
    const binary = join(app, "Contents", "MacOS", "SpeakPlayer");
    const { stdout } = await promisify(execFile)(binary, ["--control", action]);
    if (stdout.trim() === "idle")
      await showHUD("Run Speak Selected or Copied Text first");
  } catch {
    await showHUD("Could not reach the speech player");
  }
}
