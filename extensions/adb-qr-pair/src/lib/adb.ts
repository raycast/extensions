import { execFile } from "child_process";
import { promisify } from "util";
import { isWindows } from "./path-utils";

const execFileAsync = promisify(execFile);

function execOptions() {
  const env = { ...process.env };
  // Use adb’s built-in mDNS backend on Windows when Bonjour isn’t installed
  if (isWindows() && env.ADB_MDNS_OPENSCREEN === undefined) {
    env.ADB_MDNS_OPENSCREEN = "1";
  }

  return {
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: isWindows(),
    env,
  };
}

export type MdnsService = {
  instanceName: string;
  serviceType: string;
  host: string;
  port: number;
};

export class AdbError extends Error {
  constructor(
    message: string,
    readonly stderr?: string,
  ) {
    super(message);
    this.name = "AdbError";
  }
}

export async function execAdb(adbPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(adbPath, args, execOptions());
    return { stdout: stdout.toString(), stderr: stderr.toString() };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      stdout?: Buffer;
      stderr?: Buffer;
      code?: number;
    };
    const stderr = execError.stderr?.toString() ?? execError.message;
    const message = [execError.stdout?.toString(), stderr].filter(Boolean).join("\n").trim();
    throw new AdbError(message || `adb ${args.join(" ")} failed`, stderr);
  }
}

export async function checkAdb(adbPath: string): Promise<void> {
  await execAdb(adbPath, ["version"]);
}

export type MdnsCheckResult = {
  ok: boolean;
  message: string;
};

/** Warn when mDNS discovery is unavailable (common on Windows without Bonjour). */
export async function checkMdns(adbPath: string): Promise<MdnsCheckResult> {
  try {
    const { stdout, stderr } = await execAdb(adbPath, ["mdns", "check"]);
    const combined = `${stdout}\n${stderr}`.trim();
    const lower = combined.toLowerCase();

    if (lower.includes("error") || lower.includes("failed") || lower.includes("not available")) {
      return { ok: false, message: combined };
    }

    return { ok: true, message: combined };
  } catch (error) {
    const message = error instanceof AdbError ? error.message : "mDNS check failed";
    return { ok: false, message };
  }
}

export function parseMdnsServices(output: string): MdnsService[] {
  const services: MdnsService[] = [];

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("List of")) {
      continue;
    }

    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(\d+\.\d+\.\d+\.\d+):(\d+)$/);
    if (!match) {
      continue;
    }

    services.push({
      instanceName: match[1],
      serviceType: match[2],
      host: match[3],
      port: Number.parseInt(match[4], 10),
    });
  }

  return services;
}

export async function listMdnsServices(adbPath: string): Promise<MdnsService[]> {
  const { stdout } = await execAdb(adbPath, ["mdns", "services"]);
  return parseMdnsServices(stdout);
}

export async function pairDevice(adbPath: string, host: string, port: number, password: string): Promise<string> {
  const { stdout } = await execAdb(adbPath, ["pair", `${host}:${port}`, password]);
  return stdout.trim();
}

export async function connectDevice(adbPath: string, host: string, port: number): Promise<string> {
  const { stdout } = await execAdb(adbPath, ["connect", `${host}:${port}`]);
  return stdout.trim();
}

export async function listDevices(adbPath: string): Promise<string> {
  const { stdout } = await execAdb(adbPath, ["devices", "-l"]);
  return stdout.trim();
}
