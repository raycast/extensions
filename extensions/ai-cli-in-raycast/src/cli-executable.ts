import { execFile } from "node:child_process";
import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join, win32 } from "node:path";
import { envValue, executableEnv, expandHome } from "./executable";
import type { CliProviderId } from "./cli-protocols";

export type CliExecutable = {
  command: string;
  prefix: string[];
  env: NodeJS.ProcessEnv;
};
const names: Record<CliProviderId, string[]> = {
  qoder: ["qodercli", "qoder"],
  "qoder-cn": ["qoderclicn", "qodercn"],
  workbuddy: ["workbuddy"],
  gemini: ["gemini"],
};
const npmEntries: Record<CliProviderId, string[]> = {
  qoder: ["@qoder-ai/qodercli/bundle/qodercli.js"],
  "qoder-cn": ["@qodercn-ai/qoderclicn/bundle/qoderclicn.js"],
  workbuddy: [],
  gemini: [
    "@google/gemini-cli/bundle/gemini.js",
    "@google/gemini-cli/dist/index.js",
  ],
};
function isFile(path: string, executable = false) {
  try {
    accessSync(
      path,
      executable && process.platform !== "win32"
        ? constants.X_OK
        : constants.F_OK,
    );
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
async function lookup(name: string, env: NodeJS.ProcessEnv): Promise<string[]> {
  return new Promise((resolve) =>
    execFile(
      process.platform === "win32" ? "where.exe" : "/usr/bin/which",
      [name],
      { env, timeout: 4000, windowsHide: true, maxBuffer: 128 * 1024 },
      (error, out) => resolve(error ? [] : out.trim().split(/\r?\n/)),
    ),
  );
}

/** Installed-app metadata is evidence of an install, not evidence of CLI sign-in. */
export function workBuddyRootsFromMetadata(value: unknown): string[] {
  const roots = new Set<string>();
  const rows = Array.isArray(value) ? value : [value];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const entry = row as Record<string, unknown>;
    const addExecutable = (input: unknown) => {
      if (typeof input !== "string") return;
      const file = input
        .trim()
        .replace(/,\s*-?\d+$/, "")
        .replace(/^"(.*)"$/, "$1");
      if (
        win32.isAbsolute(file) &&
        /^workbuddy(?:[ -]?ai)?\.exe$/i.test(win32.basename(file))
      )
        roots.add(win32.dirname(file));
    };
    addExecutable(entry.processPath);
    if (
      typeof entry.displayName !== "string" ||
      !/^workbuddy(?:[ -]?ai)?(?:\s|$)/i.test(entry.displayName)
    )
      continue;
    if (typeof entry.installLocation === "string") {
      const root = entry.installLocation.trim().replace(/^"(.*)"$/, "$1");
      if (win32.isAbsolute(root)) roots.add(root);
    }
    addExecutable(entry.displayIcon);
  }
  return [...roots];
}

async function discoverWorkBuddyRoots(
  env: NodeJS.ProcessEnv,
): Promise<string[]> {
  if (process.platform !== "win32") return [];
  // Fixed read-only script: do not inspect command lines, user configuration,
  // credentials, or arbitrary drive contents to locate a custom install.
  const script = [
    "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)",
    "$rows = @()",
    "Get-Process -Name '*WorkBuddy*' -ErrorAction SilentlyContinue | ForEach-Object { $rows += @{ processPath = $_.Path } }",
    "Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match '^WorkBuddy(?:[ -]?AI)?(?:\\s|$)' } | ForEach-Object { $rows += @{ displayName = $_.DisplayName; installLocation = $_.InstallLocation; displayIcon = $_.DisplayIcon } }",
    "ConvertTo-Json -InputObject @($rows) -Compress",
  ].join("\n");
  return new Promise((resolve) =>
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { env, timeout: 5000, windowsHide: true, maxBuffer: 128 * 1024 },
      (error, output) => {
        try {
          resolve(error ? [] : workBuddyRootsFromMetadata(JSON.parse(output)));
        } catch {
          resolve([]);
        }
      },
    ),
  );
}

/** Resolve known npm wrappers to Node entrypoints; never send a prompt through cmd.exe. */
export async function resolveCliExecutable(
  provider: CliProviderId,
  explicit?: string,
): Promise<CliExecutable> {
  const home = homedir();
  const appData =
    envValue(process.env, "APPDATA") || join(home, "AppData", "Roaming");
  const local =
    envValue(process.env, "LOCALAPPDATA") || join(home, "AppData", "Local");
  const dirs = [
    join(home, ".local", "bin"),
    join(home, ".npm-global", "bin"),
    join(appData, "npm"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];
  const env = executableEnv(dirs);
  const requested = explicit?.trim().replace(/^"(.*)"$/, "$1");
  const candidates = requested ? [expandHome(requested)] : [];
  if (!requested) {
    for (const name of names[provider]) {
      candidates.push(...(await lookup(name, env)));
      for (const dir of dirs)
        candidates.push(
          join(dir, name + (process.platform === "win32" ? ".exe" : "")),
        );
    }
    for (const root of [
      join(appData, "npm", "node_modules"),
      join(home, ".npm-global", "lib", "node_modules"),
      "/opt/homebrew/lib/node_modules",
      "/usr/local/lib/node_modules",
    ])
      candidates.push(
        ...npmEntries[provider].map((entry) => join(root, entry)),
      );
    if (provider === "workbuddy") {
      for (const root of [
        join(local, "Programs", "WorkBuddy AI"),
        join(local, "Programs", "WorkBuddy"),
        ...(await discoverWorkBuddyRoots(env)),
      ])
        candidates.push(
          join(
            root,
            "resources",
            "app.asar.unpacked",
            "cli",
            "bin",
            "codebuddy",
          ),
        );
      for (const name of ["WorkBuddy AI.app", "WorkBuddy.app"])
        for (const root of ["/Applications", join(home, "Applications")])
          candidates.push(
            join(
              root,
              name,
              "Contents",
              "Resources",
              "app.asar.unpacked",
              "cli",
              "bin",
              "codebuddy",
            ),
          );
    }
  }
  for (const candidate of candidates) {
    if (!isFile(candidate)) continue;
    let file = realpathSync(candidate);
    if (
      /\.(cmd|bat|ps1)$/i.test(file) ||
      (process.platform === "win32" &&
        names[provider].includes(file.split(/[/\\]/).at(-1)!))
    ) {
      const entry = npmEntries[provider]
        .map((entry) => join(dirname(file), "node_modules", entry))
        .find((path) => isFile(path));
      if (entry) file = entry;
      else if (!/app\.asar\.unpacked[/\\]cli[/\\]bin[/\\]codebuddy$/.test(file))
        continue;
    }
    const bundledWorkBuddy =
      provider === "workbuddy" &&
      /app\.asar\.unpacked[/\\]cli[/\\]bin[/\\]codebuddy$/.test(file);
    const isNode = /\.[cm]?js$/i.test(file) || bundledWorkBuddy;
    let command = file;
    let prefix: string[] = [];
    if (isNode) {
      const nodeCandidates = [
        join(dirname(file), process.platform === "win32" ? "node.exe" : "node"),
        ...(await lookup(
          process.platform === "win32" ? "node.exe" : "node",
          env,
        )),
        join(
          envValue(process.env, "ProgramFiles") || "C:/Program Files",
          "nodejs",
          "node.exe",
        ),
      ];
      const node = nodeCandidates.find((path) => isFile(path, true));
      if (!node)
        throw new Error(
          "Node.js was not found. Install Node.js or add it to PATH for this CLI.",
        );
      command = node;
      prefix = [file];
    } else if (!isFile(file, true)) continue;
    return {
      command,
      prefix,
      env: {
        ...env,
        PATH: [dirname(command), dirname(file), env.PATH].join(delimiter),
        ...(bundledWorkBuddy ? { CODEBUDDY_FORCE_LITE_WB_BUNDLE: "1" } : {}),
      },
    };
  }
  throw new Error(
    `${provider} CLI was not found. Install and sign in to it, or set its CLI Path to the executable or Node entrypoint.`,
  );
}

export function runCli(
  executable: CliExecutable,
  args: string[],
): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(
      executable.command,
      [...executable.prefix, ...args],
      {
        env: executable.env,
        timeout: 25_000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
      (error, stdout) =>
        error
          ? reject(
              new Error(
                "The CLI connection check failed. Open it in your terminal to check installation and sign-in.",
              ),
            )
          : resolve(stdout),
    ),
  );
}
