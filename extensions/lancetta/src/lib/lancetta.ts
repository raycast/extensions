import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import { DOWNLOAD_URL, LancettaUnavailable, SUPPORTED_SCHEMA } from "./snapshot";

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
 * Runs one of Lancetta's commands and returns what it printed. The app's entry point answers
 * and exits without starting a second copy of the menu bar app, and none of the commands
 * reads an agent: a second reader would put up a second keychain dialog.
 */
async function lancetta(args: string[], timeout: number): Promise<string> {
  const app = appPath();
  if (!app) {
    throw new LancettaUnavailable(
      "missing",
      `Lancetta is not installed in /Applications or ~/Applications. It is a macOS menu bar app: ${DOWNLOAD_URL}`,
    );
  }
  try {
    // `history --json` is about 360 KB of compact JSON on a Mac with a few months of readings
    const { stdout } = await run(join(app, "Contents", "MacOS", "Lancetta"), args, {
      timeout,
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const { code, stderr, killed } = error as { code?: number | string; stderr?: string; killed?: boolean };
    const first = (stderr ?? "").trim().split("\n")[0] || (error as Error).message;
    if (code === 64 && (stderr ?? "").includes("unknown command")) {
      throw new LancettaUnavailable(
        "outdated",
        `This Lancetta cannot export its records to Raycast. Update Lancetta to 0.70 or later: ${DOWNLOAD_URL}`,
      );
    }
    // `history` exits 1 when usage.json is missing: the app has not run on this Mac
    if (code === 1 && args[0] === "history") {
      throw new LancettaUnavailable(
        "missing",
        `Lancetta has not run on this Mac. It is a macOS menu bar app: ${DOWNLOAD_URL}`,
      );
    }
    throw new LancettaUnavailable(
      "unreadable",
      killed
        ? `Lancetta ${args[0]} did not answer in ${timeout / 1000} seconds.`
        : `Lancetta ${args[0]} failed: ${first}`,
    );
  }
}

/**
 * One of the documents `Lancetta history|sessions|tokens --json` prints. Their `schema`
 * changes only when a field is removed, renamed or changes meaning, as `usage.json`'s does.
 */
export async function lancettaExport<T extends { schema: number }>(args: string[], timeout = 20000): Promise<T> {
  const text = await lancetta([...args, "--json"], timeout);
  let document: T;
  try {
    document = JSON.parse(text) as T;
  } catch {
    throw new LancettaUnavailable("unreadable", `Lancetta ${args[0]} did not print JSON.`);
  }
  if (document.schema !== SUPPORTED_SCHEMA) {
    throw new LancettaUnavailable(
      "schema",
      `Lancetta writes schema ${document.schema} for ${args[0]}; this extension reads schema ${SUPPORTED_SCHEMA}. Update the extension.`,
    );
  }
  return document;
}

/** `Lancetta statusline`: the snapshot in one line, worded by the app itself. */
export async function statusLine(): Promise<string> {
  return (await lancetta(["statusline"], 5000)).trim();
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
