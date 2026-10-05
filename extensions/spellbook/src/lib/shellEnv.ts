import { execFile } from "node:child_process";

const DELIMITER = "__SPELLBOOK_ENV_DELIMITER__";
const CAPTURE_TIMEOUT_MS = 10000;

export function defaultShell(): string {
  const shell = process.env.SHELL;
  return shell === undefined || shell === "" ? "/bin/zsh" : shell;
}

export function fallbackEnv(): NodeJS.ProcessEnv {
  const path = process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin";
  return {
    ...process.env,
    PATH: `/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:${path}`,
  };
}

export function parseEnvOutput(
  output: string,
): Record<string, string> | undefined {
  const parts = output.split(DELIMITER);
  if (parts.length < 3) {
    return undefined;
  }
  const env: Record<string, string> = {};
  // entries are NUL-delimited (env -0) so multi-line values survive intact
  for (const entry of parts[1].split("\0")) {
    const separator = entry.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    env[entry.slice(0, separator)] = entry.slice(separator + 1);
  }
  return Object.keys(env).length > 0 ? env : undefined;
}

export function captureShellEnv(): Promise<NodeJS.ProcessEnv> {
  return new Promise((resolve) => {
    const script = `printf '%s' '${DELIMITER}'; command env -0; printf '%s' '${DELIMITER}'`;
    execFile(
      defaultShell(),
      ["-ilc", script],
      {
        timeout: CAPTURE_TIMEOUT_MS,
        env: {
          ...process.env,
          DISABLE_AUTO_UPDATE: "true",
          ZSH_TMUX_AUTOSTART: "false",
          TERM: "dumb",
        },
      },
      (error, stdout) => {
        if (error) {
          resolve(fallbackEnv());
          return;
        }
        resolve(parseEnvOutput(stdout) ?? fallbackEnv());
      },
    );
  });
}
