/**
 * Launches a command in Terminal.app.
 *
 * `gh auth login` is interactive — it needs a real TTY to show the one-time
 * code and wait for the browser round-trip — so Raycast can't host it. What it
 * *can* do is open a terminal with the command already running, which is the
 * difference between "go work out how to authenticate" and pressing Enter.
 *
 * This deliberately avoids AppleScript. Driving Terminal with
 * `tell application "Terminal"` needs the Automation (Apple Events) TCC grant,
 * which fails outright with error -1743 when the user hasn't granted it — and
 * the prompt doesn't always appear. Writing an executable `.command` file and
 * handing it to `open` goes through LaunchServices instead, which needs no
 * special permission at all.
 *
 * Terminal.app is used rather than the user's preferred terminal because it
 * ships with every Mac and this is a once-ever action.
 */
import { execFile } from "node:child_process";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import { environment } from "@raycast/api";

const run = promisify(execFile);

/** Wraps an argument in single quotes so the shell treats it literally. */
export function shellQuote(arg: string): string {
  return `'${arg.replaceAll("'", `'\\''`)}'`;
}

/** Renders an argv array as a safely quoted command line. */
export function commandLine(argv: string[]): string {
  return argv.map(shellQuote).join(" ");
}

/**
 * Opens Terminal.app running `argv`. Resolves once Terminal has been asked to
 * open — not when the command finishes.
 *
 * Arguments are passed as an array and quoted individually, so a value coming
 * from preferences (the GitHub Enterprise hostname) can't break out into the
 * surrounding shell.
 */
export async function runInTerminal(argv: string[], banner?: string): Promise<void> {
  const script = join(environment.supportPath, "launch.command");
  await mkdir(dirname(script), { recursive: true });

  const body = [
    "#!/bin/zsh",
    "# Written by the GH Review Raycast extension. Safe to delete.",
    ...(banner ? [`echo ${shellQuote(banner)}`, "echo"] : []),
    commandLine(argv),
    "",
  ].join("\n");

  await writeFile(script, body, "utf8");
  await chmod(script, 0o755);

  await run("/usr/bin/open", ["-a", "Terminal", script], { timeout: 15_000 });
}
