import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { isRecord, parseUsage, UsageSnapshot } from "./usage";

const commonDirectories = [
  join(homedir(), ".vite-plus/bin"),
  join(homedir(), ".local/bin"),
  join(homedir(), ".npm-global/bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
];

export async function findCodex(configuredPath = ""): Promise<string> {
  const path = configuredPath.trim();
  const candidates = path
    ? [path.startsWith("~/") ? join(homedir(), path.slice(2)) : path]
    : [...(process.env.PATH?.split(delimiter) ?? []), ...commonDirectories]
        .filter(Boolean)
        .map((dir) => join(dir, "codex"));
  for (const candidate of new Set(candidates)) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // GUI apps often have a different PATH from the terminal.
    }
  }
  throw new Error(
    path
      ? "Codex was not found at the configured path. Check Codex Executable in extension preferences."
      : "Install Codex, run codex login, or set Codex Executable in extension preferences.",
  );
}

interface AppServerOptions {
  args?: string[];
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
}

interface AppServerUsage {
  payload: unknown;
  planType: string | null;
}

// Tinycast buffers child-process output and doesn't implement readline. The bundled native
// helper owns the interactive protocol; JavaScript only receives its final JSON response.
export function readAppServerUsage(
  executable: string,
  helperPath: string,
  options: AppServerOptions = {},
): Promise<AppServerUsage> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new Error("Usage refresh was cancelled."));
      return;
    }
    const timeoutMs = options.timeoutMs ?? 20000;
    let settled = false;
    const finish = (error?: Error, result?: AppServerUsage) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else if (result) resolve(result);
    };
    const child = execFile(
      helperPath,
      [executable, String(timeoutMs), ...(options.args ?? ["app-server"])],
      {
        cwd: homedir(),
        env: {
          ...process.env,
          ...options.env,
          PATH: [dirname(executable), ...commonDirectories, options.env?.PATH ?? process.env.PATH ?? ""].join(
            delimiter,
          ),
        },
        encoding: "utf8",
        timeout: timeoutMs + 3000,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout) => {
        if (settled) return;
        let response: unknown;
        try {
          response = JSON.parse(stdout);
        } catch {
          finish(new Error("Could not run the usage helper. Rebuild or reinstall the extension."));
          return;
        }
        if (isRecord(response) && typeof response.error === "string") {
          finish(new Error(response.error));
        } else if (!error && isRecord(response) && isRecord(response.payload)) {
          finish(undefined, {
            payload: response.payload,
            planType: typeof response.planType === "string" ? response.planType : null,
          });
        } else {
          finish(new Error("The usage helper returned an invalid response. Try rebuilding the extension."));
        }
      },
    );
    const abort = () => {
      child.kill("SIGTERM");
      finish(new Error("Usage refresh was cancelled."));
    };
    options.signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function fetchUsage(
  configuredPath: string,
  helperPath: string,
  signal?: AbortSignal,
): Promise<UsageSnapshot> {
  const executable = await findCodex(configuredPath);
  const { payload, planType } = await readAppServerUsage(executable, helperPath, { signal });
  return parseUsage(payload, planType);
}
