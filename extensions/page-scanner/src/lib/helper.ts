/**
 * Setting up the native host (FEATURES.md F9) from Raycast, and putting it right when the Node
 * it runs on has gone.
 *
 * The wrapper Chrome runs names a Node by its path. Raycast's own is under a versioned
 * directory (`.../com.raycast.macos/NodeJS/runtime/22.22.2/bin/node`) that an update of Raycast
 * replaces, so a Node installed where its path stays put is named instead when there is one:
 * Homebrew's symlink, which follows every upgrade. Without one, Raycast's Node is named, and
 * Scan Current Tab writes the wrapper again the next time it finds that Node gone.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { runCli, type CliResult } from "./cli";

/** Paths that keep naming a working Node across upgrades. Not fnm's or nvm's, which are versioned. */
const STABLE_NODES = ["/opt/homebrew/bin/node", "/usr/local/bin/node"];

/** The oldest Node the helper is run on here: Raycast's own, which the bundle is tested with. */
const MIN_MAJOR = 22;

function nodeMajor(node: string): Promise<number | null> {
  return new Promise((resolve) => {
    execFile(node, ["--version"], { timeout: 5_000 }, (error, stdout) => {
      const major = /^v(\d+)\./.exec(stdout.trim())?.[1];
      resolve(error || major === undefined ? null : Number(major));
    });
  });
}

/** The Node the wrapper should name: a stable one on this Mac, or Raycast's. */
export async function helperNode(): Promise<string> {
  for (const node of STABLE_NODES) {
    if (!existsSync(node)) continue;
    const major = await nodeMajor(node);
    if (major !== null && major >= MIN_MAJOR) return node;
  }
  return process.execPath;
}

export async function installHelper(): Promise<CliResult<{ node: string }>> {
  return runCli(["install", "--node", await helperNode()]);
}
