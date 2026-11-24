import { execFile } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { delimiter, dirname } from "node:path";

export function cliEnvironment(cli: string): NodeJS.ProcessEnv {
  // An npm launcher needs the Node installation alongside it, including when Raycast has a short PATH.
  const path = [dirname(cli), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH ?? ""]
    .filter(Boolean)
    .join(delimiter);
  return { ...process.env, PATH: path };
}

function showsSpongeHelp(cli: string, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // With no arguments our CLI prints its help. moreutils sponge gets EOF and has no output file to open.
    const probe = execFile(
      cli,
      [],
      { env: cliEnvironment(cli), timeout: 2000, killSignal: "SIGKILL", maxBuffer: 128 * 1024, signal },
      (error, stdout) => {
        if (error?.name === "AbortError") return reject(error);
        resolve(!error && stdout.startsWith("sponge — a local article library\n"));
      },
    );
    probe.stdin?.end();
  });
}

export async function findReadingLibraryCli(candidates: string[], signal?: AbortSignal): Promise<string | undefined> {
  for (const cli of new Set(candidates)) {
    signal?.throwIfAborted();
    try {
      accessSync(cli, constants.X_OK);
      if (!statSync(cli).isFile()) continue;
    } catch {
      continue;
    }
    if (await showsSpongeHelp(cli, signal)) return cli;
  }
  return undefined;
}
