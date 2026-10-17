import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

import { resolveBinary } from "./binary";
import { MagpieFailed, MagpieNotFound } from "./errors";

const execFileAsync = promisify(execFile);

export async function magpie(
  preferencePath: string | undefined,
  args: string[],
  timeoutMs = 10_000,
): Promise<string> {
  const binPath = resolveBinary(preferencePath);
  if (!existsSync(binPath)) {
    throw new MagpieNotFound(`Magpie not found at ${binPath}`);
  }

  try {
    const { stdout } = await execFileAsync(binPath, args, {
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1", TERM: "dumb" },
    });
    return stdout;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      killed?: boolean;
      signal?: NodeJS.Signals;
    };
    if (err.killed || err.signal === "SIGTERM") {
      throw new MagpieFailed(`magpie ${args.join(" ")} timed out`);
    }
    const detail = (
      err.stderr ||
      err.stdout ||
      err.message ||
      "magpie failed"
    ).trim();
    throw new MagpieFailed(detail);
  }
}
