import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";

const run = promisify(execFile);

/** The app's defaults suite, where its Settings live. */
const SUITE = "com.gfazioli.Lancetta";

export const TROUBLESHOOTING_URL = "https://lancetta.app/docs/troubleshooting";

/** Each agent's colour, as Lancetta's cards wear it. */
const AGENT_TINT: Record<string, string> = { Claude: "#E07B39", Codex: "#3FB8A5" };
export const tintOf = (agent: string) => AGENT_TINT[agent] ?? "#8E8CF0";

/** The installed app, in either Applications folder. */
export function appPath(): string | null {
  for (const dir of ["/Applications", join(homedir(), "Applications")]) {
    const app = join(dir, "Lancetta.app");
    if (existsSync(app)) return app;
  }
  return null;
}

/**
 * `Lancetta statusline`: the snapshot in one line, worded by the app itself. The app's
 * entry point answers it and exits without starting a second copy of the menu bar app.
 */
export async function statusLine(): Promise<string> {
  const app = appPath();
  if (!app) throw new Error("Lancetta is not installed in /Applications or ~/Applications.");
  const { stdout } = await run(join(app, "Contents", "MacOS", "Lancetta"), ["statusline"], { timeout: 5000 });
  return stdout.trim();
}

/**
 * Whether Lancetta is set to count down what is left (Settings > Appearance), read from its
 * suite. A key never set is the app's default: what has been used.
 */
export async function lancettaShowsRemaining(): Promise<boolean> {
  try {
    const { stdout } = await run("/usr/bin/defaults", ["read", SUITE, "showRemaining"], { timeout: 3000 });
    return stdout.trim() === "1";
  } catch {
    return false;
  }
}
