import { runPowerShellScript } from "@raycast/utils";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { invalidatePackageCaches, invalidateSourceCache } from "./cache";
import {
  mergeInstalledAndPinned,
  parseLimitOutputPairs,
  parseOutdatedOutput,
  parseSourcesOutput,
} from "./parser";
import { getChocoPreferences } from "./preferences";
import {
  ChocoSource,
  CliResult,
  ElevationMethod,
  InstalledPackage,
  OutdatedPackage,
} from "./types";

const execFileAsync = promisify(execFile);

export class ChocoNotFoundError extends Error {
  constructor(
    message = "Chocolatey (choco.exe) was not found on this system.",
  ) {
    super(message);
    this.name = "ChocoNotFoundError";
  }
}

export class ElevationCanceledError extends Error {
  constructor(
    message = "Administrator elevation (UAC) was canceled by the user.",
  ) {
    super(message);
    this.name = "ElevationCanceledError";
  }
}

export class ChocoCommandError extends Error {
  exitCode: number;
  output: string;

  constructor(message: string, exitCode: number, output: string) {
    super(message);
    this.name = "ChocoCommandError";
    this.exitCode = exitCode;
    this.output = output;
  }
}

let cachedChocoPath: string | undefined;
let cachedMajorVersion: number | undefined;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the path to `choco.exe` using user preference, environment variables,
 * default Chocolatey path, or `where.exe`.
 */
export async function resolveChocoExecutable(): Promise<string> {
  const { chocoPath } = getChocoPreferences();
  if (chocoPath) {
    if (await fileExists(chocoPath)) {
      return chocoPath;
    }
    throw new ChocoNotFoundError(
      `Configured choco.exe not found at: ${chocoPath}`,
    );
  }

  if (cachedChocoPath && (await fileExists(cachedChocoPath))) {
    return cachedChocoPath;
  }

  const candidates: string[] = [];
  if (process.env.ChocolateyInstall) {
    candidates.push(
      path.join(process.env.ChocolateyInstall, "bin", "choco.exe"),
    );
  }
  candidates.push("C:\\ProgramData\\chocolatey\\bin\\choco.exe");

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      cachedChocoPath = candidate;
      return candidate;
    }
  }

  try {
    const { stdout } = await execFileAsync("where.exe", ["choco"], {
      windowsHide: true,
    });
    const found = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.toLowerCase().endsWith(".exe"));
    if (found && (await fileExists(found))) {
      cachedChocoPath = found;
      return found;
    }
  } catch {
    // Fall through to ChocoNotFoundError
  }

  throw new ChocoNotFoundError();
}

async function execRaw(
  command: string,
  args: string[],
  timeoutMs = 60_000,
): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 16,
      encoding: "utf8",
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      code?: number | string;
      message?: string;
    };
    const exitCode = typeof err.code === "number" ? err.code : 1;
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
      exitCode,
    };
  }
}

async function getChocoMajorVersion(chocoExe: string): Promise<number> {
  if (cachedMajorVersion !== undefined) {
    return cachedMajorVersion;
  }
  const result = await execRaw(chocoExe, ["--version"], 15_000);
  const match = result.stdout.trim().match(/^(\d+)\./);
  cachedMajorVersion = match ? Number.parseInt(match[1], 10) : 2;
  return cachedMajorVersion;
}

function escapePowerShellLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function hasExecutable(name: string): Promise<boolean> {
  const res = await execRaw("where.exe", [name], 5_000);
  return res.exitCode === 0 && res.stdout.trim().length > 0;
}

function isElevationCanceledMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("canceled by the user") ||
    lower.includes("cancelled by the user")
  );
}

/**
 * Runs an administrative Chocolatey command via PowerShell `Start-Process -Verb RunAs`,
 * capturing full output and exit code into temporary files.
 */
async function runWithPowerShellUac(
  chocoExe: string,
  args: string[],
): Promise<CliResult> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "raycast-choco-"));
  const id = randomUUID();
  const scriptPath = path.join(tempDir, `run-${id}.ps1`);
  const logPath = path.join(tempDir, `out-${id}.log`);
  const exitPath = path.join(tempDir, `exit-${id}.txt`);

  const psArgsArray = args.map(escapePowerShellLiteral).join(", ");
  const scriptContent = [
    "$ErrorActionPreference = 'Continue'",
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    `$chocoExe = ${escapePowerShellLiteral(chocoExe)}`,
    `$chocoArgs = @(${psArgsArray})`,
    `$logFile = ${escapePowerShellLiteral(logPath)}`,
    `$exitFile = ${escapePowerShellLiteral(exitPath)}`,
    "$output = & $chocoExe @chocoArgs 2>&1 | Out-String",
    "$code = $LASTEXITCODE",
    "if ($null -eq $code) { $code = 0 }",
    "[System.IO.File]::WriteAllText($logFile, $output, [System.Text.Encoding]::UTF8)",
    "[System.IO.File]::WriteAllText($exitFile, [string]$code, [System.Text.Encoding]::UTF8)",
  ].join("\r\n");

  try {
    await writeFile(scriptPath, scriptContent, "utf8");
    const quotedScriptArg = escapePowerShellLiteral(`"${scriptPath}"`);
    const launcherCommand = `Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',${quotedScriptArg}) -Verb RunAs -Wait -WindowStyle Hidden`;
    try {
      await runPowerShellScript(launcherCommand, { timeout: 600_000 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isElevationCanceledMessage(msg)) {
        throw new ElevationCanceledError();
      }
      throw new ChocoCommandError(
        msg.trim() || "Failed to launch elevated Chocolatey process.",
        1,
        msg,
      );
    }

    const [output, exitText] = await Promise.all([
      readFile(logPath, "utf8").catch(() => ""),
      readFile(exitPath, "utf8").catch(() => "1"),
    ]);
    const exitCode = Number.parseInt(exitText.trim(), 10);
    return {
      stdout: output,
      stderr: "",
      exitCode: Number.isFinite(exitCode) ? exitCode : 1,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Opens an elevated terminal window running the Chocolatey command.
 * Returns `launchedInTerminal: true` because terminal execution runs interactively.
 */
async function runInTerminal(
  chocoExe: string,
  args: string[],
): Promise<CliResult> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "raycast-choco-term-"));
  const id = randomUUID();
  const scriptPath = path.join(tempDir, `term-${id}.ps1`);
  const psArgsArray = args.map(escapePowerShellLiteral).join(", ");
  const scriptContent = [
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    `$chocoExe = ${escapePowerShellLiteral(chocoExe)}`,
    `$chocoArgs = @(${psArgsArray})`,
    "& $chocoExe @chocoArgs",
    "Write-Host ''",
    "Read-Host 'Press Enter to close'",
    `Remove-Item -LiteralPath ${escapePowerShellLiteral(tempDir)} -Recurse -Force -ErrorAction SilentlyContinue`,
  ].join("\r\n");

  await writeFile(scriptPath, scriptContent, "utf8");
  const quotedScriptArg = escapePowerShellLiteral(`"${scriptPath}"`);
  const hasWt = await hasExecutable("wt.exe");
  const launch = hasWt
    ? `Start-Process -FilePath 'wt.exe' -ArgumentList @('powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-File',${quotedScriptArg}) -Verb RunAs`
    : `Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',${quotedScriptArg}) -Verb RunAs`;

  try {
    await runPowerShellScript(launch, { timeout: 15_000 });
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    const msg = error instanceof Error ? error.message : String(error);
    if (isElevationCanceledMessage(msg)) {
      throw new ElevationCanceledError();
    }
    throw new ChocoCommandError(
      msg.trim() || "Failed to launch terminal Chocolatey process.",
      1,
      msg,
    );
  }

  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
    launchedInTerminal: true,
  };
}

/**
 * Executes a read-only Chocolatey CLI command without elevation.
 */
export async function runChocoRead(args: string[]): Promise<CliResult> {
  const chocoExe = await resolveChocoExecutable();
  return execRaw(chocoExe, args, 60_000);
}

/**
 * Executes a mutating Chocolatey CLI command using the configured elevation method.
 */
export async function runChocoWrite(
  args: string[],
  options: { overrideMethod?: ElevationMethod } = {},
): Promise<CliResult> {
  const chocoExe = await resolveChocoExecutable();
  const prefs = getChocoPreferences();
  const method = options.overrideMethod ?? prefs.elevationMethod;

  let result: CliResult;
  if (method === "none") {
    result = await execRaw(chocoExe, args, 600_000);
  } else if (method === "gsudo") {
    if (await hasExecutable("gsudo.exe")) {
      result = await execRaw("gsudo.exe", [chocoExe, ...args], 600_000);
    } else {
      result = await runWithPowerShellUac(chocoExe, args);
    }
  } else if (method === "terminal") {
    result = await runInTerminal(chocoExe, args);
  } else {
    result = await runWithPowerShellUac(chocoExe, args);
  }

  if (result.exitCode !== 0) {
    const detail = (result.stdout || result.stderr).trim();
    throw new ChocoCommandError(
      detail
        ? detail.split(/\r?\n/).slice(-5).join("\n")
        : `choco exited with code ${result.exitCode}`,
      result.exitCode,
      detail,
    );
  }

  return result;
}

export async function getChocoDiagnostics(): Promise<{
  executable: string;
  version: string;
}> {
  const chocoExe = await resolveChocoExecutable();
  const res = await execRaw(chocoExe, ["--version"], 15_000);
  return {
    executable: chocoExe,
    version: res.stdout.trim() || "unknown",
  };
}

export async function listInstalledPackages(): Promise<InstalledPackage[]> {
  const chocoExe = await resolveChocoExecutable();
  const major = await getChocoMajorVersion(chocoExe);
  const listArgs = major >= 2 ? ["list", "-r"] : ["list", "--local-only", "-r"];

  const [listRes, pinRes] = await Promise.all([
    execRaw(chocoExe, listArgs),
    execRaw(chocoExe, ["pin", "list", "-r"]),
  ]);
  if (listRes.exitCode !== 0) {
    throw new ChocoCommandError(
      "Failed to list installed Chocolatey packages.",
      listRes.exitCode,
      listRes.stderr,
    );
  }

  const installedPairs = parseLimitOutputPairs(listRes.stdout);
  const pinnedPairs =
    pinRes.exitCode === 0 ? parseLimitOutputPairs(pinRes.stdout) : [];
  return mergeInstalledAndPinned(installedPairs, pinnedPairs);
}

export async function listOutdatedPackages(): Promise<OutdatedPackage[]> {
  const res = await runChocoRead(["outdated", "-r"]);
  // `choco outdated` returns 0 when up-to-date or outdated packages are found cleanly
  if (res.exitCode !== 0 && res.exitCode !== 2) {
    throw new ChocoCommandError(
      "Failed to check outdated packages.",
      res.exitCode,
      res.stderr || res.stdout,
    );
  }
  return parseOutdatedOutput(res.stdout);
}

export async function searchPackagesViaCli(
  query: string,
  includePrerelease: boolean,
): Promise<Array<{ id: string; version: string }>> {
  const args = ["search", query.trim(), "-r"];
  if (includePrerelease) {
    args.push("--pre");
  }
  const res = await runChocoRead(args);
  if (res.exitCode !== 0) {
    throw new ChocoCommandError(
      "Failed to search Chocolatey packages via CLI.",
      res.exitCode,
      res.stderr || res.stdout,
    );
  }
  return parseLimitOutputPairs(res.stdout);
}

export async function getPackageInfoText(id: string): Promise<string> {
  const res = await runChocoRead(["info", id]);
  if (res.exitCode !== 0) {
    throw new ChocoCommandError(
      `Failed to get info for ${id}.`,
      res.exitCode,
      res.stderr || res.stdout,
    );
  }
  return res.stdout.trim();
}

export async function installPackage(
  id: string,
  options: { version?: string; forceTerminal?: boolean } = {},
): Promise<CliResult> {
  const prefs = getChocoPreferences();
  const args = ["install", id];
  if (options.version?.trim()) {
    args.push("--version", options.version.trim());
  }
  if (prefs.includePrerelease) {
    args.push("--pre");
  }
  if (prefs.confirmAutomatically) {
    args.push("-y");
  }
  const result = await runChocoWrite(args, {
    overrideMethod: options.forceTerminal ? "terminal" : undefined,
  });
  if (!result.launchedInTerminal) {
    invalidatePackageCaches();
  }
  return result;
}

export async function upgradePackage(
  id: string,
  options: { forceTerminal?: boolean } = {},
): Promise<CliResult> {
  const prefs = getChocoPreferences();
  const args = ["upgrade", id];
  if (prefs.confirmAutomatically) {
    args.push("-y");
  }
  const result = await runChocoWrite(args, {
    overrideMethod: options.forceTerminal ? "terminal" : undefined,
  });
  if (!result.launchedInTerminal) {
    invalidatePackageCaches();
  }
  return result;
}

export async function upgradeAllPackages(
  options: { forceTerminal?: boolean } = {},
): Promise<CliResult> {
  const prefs = getChocoPreferences();
  const args = ["upgrade", "all"];
  if (prefs.confirmAutomatically) {
    args.push("-y");
  }
  const result = await runChocoWrite(args, {
    overrideMethod: options.forceTerminal ? "terminal" : undefined,
  });
  if (!result.launchedInTerminal) {
    invalidatePackageCaches();
  }
  return result;
}

export async function uninstallPackage(
  id: string,
  options: { forceTerminal?: boolean } = {},
): Promise<CliResult> {
  const prefs = getChocoPreferences();
  const args = ["uninstall", id];
  if (prefs.confirmAutomatically) {
    args.push("-y");
  }
  const result = await runChocoWrite(args, {
    overrideMethod: options.forceTerminal ? "terminal" : undefined,
  });
  if (!result.launchedInTerminal) {
    invalidatePackageCaches();
  }
  return result;
}

export async function pinPackage(id: string): Promise<CliResult> {
  const result = await runChocoWrite(["pin", "add", `--name=${id}`]);
  if (!result.launchedInTerminal) {
    invalidatePackageCaches();
  }
  return result;
}

export async function unpinPackage(id: string): Promise<CliResult> {
  const result = await runChocoWrite(["pin", "remove", `--name=${id}`]);
  if (!result.launchedInTerminal) {
    invalidatePackageCaches();
  }
  return result;
}

export async function listSources(): Promise<ChocoSource[]> {
  const res = await runChocoRead(["source", "list", "-r"]);
  if (res.exitCode !== 0) {
    throw new ChocoCommandError(
      "Failed to list Chocolatey sources.",
      res.exitCode,
      res.stderr || res.stdout,
    );
  }
  return parseSourcesOutput(res.stdout);
}

export async function addSource(params: {
  name: string;
  url: string;
  priority?: number;
}): Promise<CliResult> {
  const args = [
    "source",
    "add",
    `--name=${params.name}`,
    `--source=${params.url}`,
  ];
  if (params.priority !== undefined && Number.isFinite(params.priority)) {
    args.push(`--priority=${params.priority}`);
  }
  const result = await runChocoWrite(args);
  if (!result.launchedInTerminal) {
    invalidateSourceCache();
  }
  return result;
}

export async function removeSource(name: string): Promise<CliResult> {
  const result = await runChocoWrite(["source", "remove", `--name=${name}`]);
  if (!result.launchedInTerminal) {
    invalidateSourceCache();
  }
  return result;
}

export async function setSourceEnabled(
  name: string,
  enabled: boolean,
): Promise<CliResult> {
  const action = enabled ? "enable" : "disable";
  const result = await runChocoWrite(["source", action, `--name=${name}`]);
  if (!result.launchedInTerminal) {
    invalidateSourceCache();
  }
  return result;
}
