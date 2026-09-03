import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { HelperCounters, MouseDevice, OperationResult } from "../../domain/models";
import { DeviceCatalog } from "../../ports/device-catalog";

const execFileAsync = promisify(execFile);

export interface RawAccessStatus {
  protocolVersion: 1;
  inputMonitoring: boolean;
  accessibility: boolean;
}
export interface RawRuntimeStatus {
  protocolVersion: 1;
  state: "stopped" | "running" | "stale" | "identityMismatch";
  pid?: number;
  executablePath?: string;
  detail?: string;
  counters?: HelperCounters;
}
interface RawDeviceList {
  protocolVersion: 1;
  devices: MouseDevice[];
}

export class NativeHelperClient implements DeviceCatalog {
  constructor(
    readonly packagedPath: string,
    readonly installedPath: string,
    readonly statePath: string,
  ) {}

  private async json<T extends { protocolVersion?: number }>(
    executable: string,
    args: string[],
  ): Promise<OperationResult<T>> {
    try {
      const { stdout } = await execFileAsync(executable, args, { timeout: 5_000, maxBuffer: 1_000_000 });
      const parsed = JSON.parse(stdout) as T;
      if (parsed && "protocolVersion" in parsed && parsed.protocolVersion !== 1) {
        return {
          status: "unavailable",
          reason: "Native helper protocol version is unsupported.",
          recovery: "Rebuild the extension helper.",
        };
      }
      return { status: "succeeded", value: parsed };
    } catch (error) {
      return { status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  async list(): Promise<OperationResult<MouseDevice[]>> {
    const result = await this.json<RawDeviceList>(this.packagedPath, ["devices"]);
    return result.status === "succeeded" ? { status: "succeeded", value: result.value.devices } : result;
  }
  access(executable = this.packagedPath, prompt = false): Promise<OperationResult<RawAccessStatus>> {
    return this.json(executable, ["access", ...(prompt ? ["--prompt"] : [])]);
  }
  runtimeStatus(): Promise<OperationResult<RawRuntimeStatus>> {
    return this.json(this.installedPath, [
      "status",
      "--state",
      this.statePath,
      "--expected-executable",
      this.installedPath,
    ]);
  }
  stop(): Promise<OperationResult<RawRuntimeStatus>> {
    return this.json(this.installedPath, [
      "stop",
      "--state",
      this.statePath,
      "--expected-executable",
      this.installedPath,
    ]);
  }
}
