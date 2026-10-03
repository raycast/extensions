import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LearnCommandResult } from "./capture.js";

const execFileAsync = promisify(execFile);

// Raycast launches extensions with a minimal PATH (/usr/bin:/bin:...), so neither a
// globally installed `learn` nor the `node` its `#!/usr/bin/env node` shebang needs
// would be found without the common Homebrew/user install locations.
const EXTRA_PATH_ENTRIES = ["/opt/homebrew/bin", "/usr/local/bin"];

function learnEnv(): NodeJS.ProcessEnv {
  const entries = (process.env.PATH || "").split(":").filter(Boolean);
  for (const entry of EXTRA_PATH_ENTRIES) {
    if (!entries.includes(entry)) entries.push(entry);
  }
  return { ...process.env, PATH: entries.join(":") };
}

export async function runLearn(
  args: string[],
  executable = "learn",
): Promise<LearnCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(executable, args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      env: learnEnv(),
    });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const result = error as {
      stdout?: string;
      stderr?: string;
      code?: number | string;
      message?: string;
    };
    const exited = typeof result.code === "number";
    return {
      stdout: result.stdout || "",
      // Spawn failures (e.g. ENOENT when `learn` is not found) have no stderr and a
      // string code; keep the error message so callers can surface an actionable reason.
      stderr: result.stderr || (exited ? "" : result.message || ""),
      code: exited ? (result.code as number) : 1,
    };
  }
}

export async function listLearnWorkspaces(
  executable = "learn",
): Promise<string[]> {
  const result = await runLearn(["list", "--json"], executable);
  if (result.code !== 0) {
    throw new Error(result.stderr || "Unable to list Learn workspaces");
  }

  try {
    const workspaces: unknown = JSON.parse(result.stdout);
    if (
      !Array.isArray(workspaces) ||
      !workspaces.every((item) => typeof item === "string")
    ) {
      throw new Error("invalid workspace list");
    }
    return workspaces;
  } catch {
    throw new Error("Learn returned an invalid workspace list");
  }
}
