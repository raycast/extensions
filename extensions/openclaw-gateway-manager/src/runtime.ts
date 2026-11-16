import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";

export function searchPaths(
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
): string[] {
  const paths = [
    join(home, ".local/bin"),
    env.PNPM_HOME,
    join(home, "Library/pnpm"),
    join(home, ".npm-global/bin"),
    ...(env.PATH ?? "").split(delimiter),
    env.FNM_DIR && join(env.FNM_DIR, "aliases/default/bin"),
    join(home, ".local/share/fnm/aliases/default/bin"),
    join(home, "Library/Application Support/fnm/aliases/default/bin"),
    join(home, ".nvm/current/bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  return [...new Set(paths.filter((path): path is string => Boolean(path)))];
}

function executable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function resolveBinary(
  configured = "",
  paths = searchPaths(),
  home = homedir(),
): string {
  const path = configured.trim().replace(/^~(?=\/)/, home);
  if (path && executable(path)) return path;
  // Old versions persisted this default. Recover automatically if it was removed.
  if (path && path !== join(home, "Library/pnpm/openclaw")) {
    throw new Error(
      "OpenClaw executable not found. Check OpenClaw Binary Path in extension preferences.",
    );
  }
  for (const directory of paths) {
    const candidate = join(directory, "openclaw");
    if (executable(candidate)) return candidate;
  }
  throw new Error(
    "OpenClaw was not found. Install it or set OpenClaw Binary Path in extension preferences.",
  );
}

export function commandEnvironment(
  binary: string,
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...env,
    PATH: [
      ...new Set([
        dirname(binary),
        dirname(realpathSync(binary)),
        ...searchPaths(env),
      ]),
    ].join(delimiter),
    NO_COLOR: "1",
  };
}

export function runExecutable(
  binary: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeout = 20000,
  maxBuffer = 2 * 1024 * 1024,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      binary,
      args,
      { encoding: "utf8", env, timeout, maxBuffer },
      (error, stdout) => {
        if (error) {
          reject(
            new Error(
              error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"
                ? "OpenClaw output exceeded CLI Output Limit. Increase it in extension preferences."
                : error.killed
                  ? "OpenClaw command timed out. Try again or check the Gateway."
                  : "OpenClaw command failed. Check the executable, Gateway and local configuration.",
            ),
          );
        } else resolve(stdout);
      },
    );
  });
}
