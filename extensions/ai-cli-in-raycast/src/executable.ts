import { execFile } from "node:child_process";
import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, win32, posix, delimiter } from "node:path";

export type Executable = {
  command: string;
  shell: boolean;
  env: NodeJS.ProcessEnv;
};

// Raycast's Windows worker can expose Path/LocalAppData with their original
// casing. Worker environment objects do not have process.env's main-thread
// case-insensitive lookup behavior.
export function envValue(
  env: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  const key = Object.keys(env).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  return key ? env[key] : undefined;
}

export function executableEnv(
  paths: string[],
  source = process.env,
): NodeJS.ProcessEnv {
  const env = { ...source };
  const inherited = envValue(source, "PATH");
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === "path") delete env[key];
  }
  env.PATH = [...paths, inherited].filter(Boolean).join(delimiter);
  return env;
}

export function expandHome(value: string, home = homedir()): string {
  return value === "~"
    ? home
    : /^~[/\\]/.test(value)
      ? join(home, value.slice(2))
      : value;
}

export function pathCandidates(
  platform: string,
  home: string,
  env: NodeJS.ProcessEnv,
): string[] {
  const path = platform === "win32" ? win32 : posix;
  if (platform === "win32")
    return [
      path.join(home, ".codex", "bin", "codex.exe"),
      path.join(home, ".local", "bin", "codex.exe"),
      ...(envValue(env, "APPDATA")
        ? [path.join(envValue(env, "APPDATA")!, "npm", "codex.cmd")]
        : []),
      ...(envValue(env, "LOCALAPPDATA")
        ? [
            path.join(
              envValue(env, "LOCALAPPDATA")!,
              "Programs",
              "codex",
              "codex.exe",
            ),
          ]
        : []),
    ];
  return [
    path.join(home, ".codex", "bin", "codex"),
    path.join(home, ".local", "bin", "codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    path.join(home, ".npm-global", "bin", "codex"),
    "/usr/bin/codex",
  ];
}

function isExecutable(file: string): boolean {
  try {
    accessSync(
      file,
      process.platform === "win32" ? constants.F_OK : constants.X_OK,
    );
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

function lookup(command: string, args: string[]): Promise<string> {
  return new Promise((resolve) =>
    execFile(
      command,
      args,
      { windowsHide: true, timeout: 4000, maxBuffer: 128 * 1024 },
      (error, stdout) => resolve(error ? "" : stdout.trim()),
    ),
  );
}

// Prefer npm's native binary: it avoids cmd quoting and orphaned wrapper processes.
function nativeNpmBinary(file: string): string | undefined {
  try {
    const entry =
      process.platform === "win32" && /\.(cmd|ps1)$/i.test(file)
        ? join(
            dirname(file),
            "node_modules",
            "@openai",
            "codex",
            "bin",
            "codex.js",
          )
        : realpathSync(file);
    if (!entry.endsWith("codex.js")) return;
    const target = process.arch === "arm64" ? "aarch64" : "x86_64";
    const triple =
      process.platform === "win32"
        ? `${target}-pc-windows-msvc`
        : `${target}-apple-darwin`;
    const packageName = `@openai/codex-${process.platform}-${process.arch}`;
    const roots = [join(dirname(entry), "..", "vendor")];
    try {
      roots.unshift(
        join(
          dirname(createRequire(entry).resolve(`${packageName}/package.json`)),
          "vendor",
        ),
      );
    } catch {
      /* Older npm bundle. */
    }
    for (const root of roots)
      for (const folder of ["bin", "codex"]) {
        const candidate = join(
          root,
          triple,
          folder,
          process.platform === "win32" ? "codex.exe" : "codex",
        );
        if (isExecutable(candidate)) return candidate;
      }
  } catch {
    /* Non-npm installation; use its executable directly. */
  }
}

export function windowsShellCommand(file: string): string {
  if (/[\r\n"%!]/.test(file))
    throw new Error(
      "This script path contains characters that the Windows command interpreter cannot safely handle. Please select codex.exe.",
    );
  return `"${file}"`;
}

export async function resolveCodexExecutable(
  explicitPath?: string,
): Promise<Executable> {
  const platform = process.platform;
  const requested = explicitPath?.trim().replace(/^"(.*)"$/, "$1");
  let inheritedPath = ""; // Additional PATH from a macOS login shell, if needed.
  const choose = (input: string): Executable | null => {
    let file = input;
    if (platform === "win32" && file.endsWith(".ps1"))
      file = file.slice(0, -4) + ".cmd";
    if (!isExecutable(file)) return null;
    file = nativeNpmBinary(file) || file;
    const shell = platform === "win32" && /\.(cmd|bat)$/i.test(file);
    return {
      command: shell ? windowsShellCommand(file) : file,
      shell,
      env: executableEnv([
        dirname(file),
        inheritedPath,
        ...pathCandidates(platform, homedir(), process.env).map(dirname),
      ]),
    };
  };
  if (requested) {
    const direct = choose(expandHome(requested));
    if (direct) return direct;
    if (!/[/\\]/.test(requested)) {
      const output = await lookup(
        platform === "win32" ? "where.exe" : "/usr/bin/which",
        [requested],
      );
      for (const line of output.split(/\r?\n/)) {
        const found = choose(line.trim());
        if (found) return found;
      }
    }
    throw new Error(
      `Could not find the specified Codex: ${requested}. Please clear "Codex Path" to auto-detect, or enter the path on this computer.`,
    );
  }
  for (const name of platform === "win32"
    ? ["codex.exe", "codex.cmd"]
    : ["codex"]) {
    const output = await lookup(
      platform === "win32" ? "where.exe" : "/usr/bin/which",
      [name],
    );
    for (const line of output.split(/\r?\n/)) {
      const found = choose(line.trim());
      if (found) return found;
    }
  }
  for (const path of pathCandidates(platform, homedir(), process.env)) {
    const found = choose(path);
    if (found) return found;
  }
  if (platform === "darwin") {
    // A GUI app may not inherit the terminal's nvm/fnm/asdf PATH. No user input is interpolated.
    const shell = process.env.SHELL?.startsWith("/")
      ? process.env.SHELL
      : "/bin/zsh";
    const output = await lookup(shell, [
      "-ilc",
      'printf "\\n__CODEX_PATH__%s\\n" "$PATH"; printf "__CODEX_BIN__%s\\n" "$(command -v codex)"',
    ]);
    const lines = output.split(/\r?\n/);
    inheritedPath =
      lines.find((line) => line.startsWith("__CODEX_PATH__"))?.slice(14) ||
      inheritedPath;
    const file = lines
      .find((line) => line.startsWith("__CODEX_BIN__"))
      ?.slice(13);
    if (file) {
      const found = choose(file);
      if (found) return found;
    }
  }
  throw new Error(
    "Codex CLI (ChatGPT/Codex command-line tool) not found. Please install and sign in to Codex CLI first. If already installed, specify the executable path in Codex Path in extension settings.",
  );
}
