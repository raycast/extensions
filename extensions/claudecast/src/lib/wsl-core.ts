import path from "path";

const WSL_SYSTEM_DISTRIBUTIONS = new Set([
  "docker-desktop",
  "docker-desktop-data",
]);

export interface WslClaudeProbe {
  distribution: string;
  home: string;
  claudeConfigDirectory: string;
  claudeExecutable?: string;
}

export function decodeWslDistributionList(output: Uint8Array): string[] {
  const decoded = decodeWslText(output);
  const seen = new Set<string>();
  const distributions: string[] = [];
  for (const line of decoded.replace(/\0/g, "").split(/\r?\n/)) {
    const distribution = line.replace(/^\s*\*\s*/, "").trim();
    if (!isValidWslDistribution(distribution)) continue;
    const identity = distribution.toLocaleLowerCase();
    if (WSL_SYSTEM_DISTRIBUTIONS.has(identity) || seen.has(identity)) continue;
    seen.add(identity);
    distributions.push(distribution);
  }
  return distributions.sort((left, right) => left.localeCompare(right));
}

export function decodeWslText(output: Uint8Array): string {
  const bytes = new Uint8Array(output);
  let oddNulls = 0;
  for (let index = 1; index < bytes.length; index += 2) {
    if (bytes[index] === 0) oddNulls++;
  }
  const likelyUtf16 =
    (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes.length >= 4 && oddNulls > 0);
  return new TextDecoder(likelyUtf16 ? "utf-16le" : "utf-8").decode(bytes);
}

export function windowsPathToWslMountPath(windowsPath: string): string {
  const match = /^([A-Za-z]):[\\/](.*)$/.exec(windowsPath);
  if (!match) throw new Error("WSL Prompt File Must Use A Windows Drive Path");
  return `/mnt/${match[1].toLocaleLowerCase()}/${match[2].replace(/\\/g, "/")}`;
}

export function buildWslClaudePromptFileArgs(
  probe: Pick<WslClaudeProbe, "distribution" | "claudeExecutable">,
  cwd: string,
  claudeArgs: string[],
  wslPromptFile: string,
): string[] {
  const base = buildWslClaudeArgs(probe, cwd, []);
  const executable = base.at(-1)!;
  const prefix = base.slice(0, -1);
  const script = [
    "claude=$1",
    "prompt_file=$2",
    "shift 2",
    'prompt=$(cat -- "$prompt_file")',
    'rm -f -- "$prompt_file"',
    'exec "$claude" "$@" "$prompt"',
  ].join("\n");
  return [
    ...prefix,
    "sh",
    "-lc",
    script,
    "sh",
    executable,
    wslPromptFile,
    ...claudeArgs,
  ];
}

export function parseWslClaudeProbe(
  distribution: string,
  output: Uint8Array,
): WslClaudeProbe | null {
  if (!isValidWslDistribution(distribution)) return null;
  const fields = new TextDecoder("utf-8")
    .decode(output)
    .split("\0")
    .map((value) => value.trim());
  const home = fields[0];
  const claudeConfigDirectory = fields[1];
  const claudeExecutable = fields[2];
  if (
    !isAbsoluteLinuxPath(home) ||
    !isAbsoluteLinuxPath(claudeConfigDirectory)
  ) {
    return null;
  }
  if (claudeExecutable && !isAbsoluteLinuxPath(claudeExecutable)) return null;
  return {
    distribution,
    home,
    claudeConfigDirectory,
    claudeExecutable: claudeExecutable || undefined,
  };
}

export function wslLinuxPathToUnc(
  distribution: string,
  linuxPath: string,
  host = "wsl.localhost",
): string {
  if (!isValidWslDistribution(distribution)) {
    throw new Error("WSL Distribution Name Is Invalid");
  }
  if (!isAbsoluteLinuxPath(linuxPath)) {
    throw new Error("WSL Linux Path Must Be Absolute");
  }
  const relative = linuxPath.replace(/^\/+/, "").replace(/\//g, "\\");
  return `\\\\${host}\\${distribution}\\${relative}`;
}

export function buildWslClaudeArgs(
  probe: Pick<WslClaudeProbe, "distribution" | "claudeExecutable">,
  cwd: string,
  claudeArgs: string[],
): string[] {
  if (!isValidWslDistribution(probe.distribution)) {
    throw new Error("WSL Distribution Name Is Invalid");
  }
  if (!isAbsoluteLinuxPath(cwd)) {
    throw new Error("WSL Working Directory Must Be Absolute");
  }
  const executable = probe.claudeExecutable || "claude";
  if (probe.claudeExecutable && !isAbsoluteLinuxPath(probe.claudeExecutable)) {
    throw new Error("WSL Claude Executable Must Be Absolute");
  }
  return [
    "--distribution",
    probe.distribution,
    "--cd",
    path.posix.normalize(cwd),
    "--exec",
    executable,
    ...claudeArgs,
  ];
}

export function isValidWslDistribution(value: string): boolean {
  return (
    Boolean(value) &&
    value.length <= 256 &&
    !value.includes("\\") &&
    !value.includes("/") &&
    ![...value].some((character) => character.charCodeAt(0) < 32)
  );
}

export function isWslWindowsPathInsideRoot(
  candidate: string,
  root: string,
): boolean {
  const relative = path.win32.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.win32.isAbsolute(relative))
  );
}

function isAbsoluteLinuxPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    value.length <= 4_000 &&
    !value.includes("\0") &&
    path.posix.isAbsolute(value)
  );
}
