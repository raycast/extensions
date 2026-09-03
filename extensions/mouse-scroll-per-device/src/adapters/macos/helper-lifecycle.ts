import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, lstat, mkdir, readFile, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { HelperIdentityStatus, HelperStatus, OperationResult, PermissionState } from "../../domain/models";
import { HelperController } from "../../ports/helper-controller";
import { NativeHelperClient, RawAccessStatus } from "../native/native-helper-client";

const execFileAsync = promisify(execFile);

export interface HelperPaths {
  installedExecutable: string;
  config: string;
  state: string;
  permissionMarker: string;
  launchAgent: string;
  label: string;
  stdoutLog: string;
  stderrLog: string;
}

interface CodeIdentity {
  state: "valid" | "invalid" | "pathMismatch";
  detail: string;
  team?: string;
  identifier?: string;
  sha256?: string;
}

export type LaunchAgentPrintState = "present" | "missing" | "failed";
export const inputMonitoringSettingsURL = "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent";
export const accessibilitySettingsURL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
export const helperBundleIdentifier = "com.brandon.mouse-scroll-per-device.helper";

export function classifyLaunchctlPrintFailure(message: string): LaunchAgentPrintState {
  if (message.includes("Could not find service") || message.includes("No such process")) return "missing";
  return "failed";
}

export function inspectCodesignIdentity(
  inspection: string,
  inspectedPath: string,
  expectedPath?: string,
): CodeIdentity {
  if (expectedPath && inspectedPath !== expectedPath) {
    return {
      state: "pathMismatch",
      detail: "Installed helper path does not match the required application-support location.",
    };
  }
  const authority = inspection.match(/^Authority=(Apple Development|Developer ID Application):.+$/m)?.[1];
  const team = inspection.match(/^TeamIdentifier=(.+)$/m)?.[1]?.trim();
  const identifier = inspection.match(/^Identifier=(.+)$/m)?.[1]?.trim();
  if (authority && team && team !== "not set" && identifier === helperBundleIdentifier) {
    return {
      state: "valid",
      detail: "Helper has a stable Apple signing identity.",
      team,
      identifier,
    };
  }
  return { state: "invalid", detail: "Helper is unsigned, ad-hoc signed, or has no stable Apple team identity." };
}

function commandErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const stderr = (error as Error & { stderr?: unknown }).stderr;
    return `${error.message}\n${typeof stderr === "string" ? stderr : ""}`.trim();
  }
  return String(error);
}

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function launchAgentPlist(paths: HelperPaths): string {
  const value = (input: string) => xml(input);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>${value(paths.label)}</string><key>ProgramArguments</key><array><string>${value(paths.installedExecutable)}</string><string>run</string><string>--config</string><string>${value(paths.config)}</string><string>--state</string><string>${value(paths.state)}</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>StandardOutPath</key><string>${value(paths.stdoutLog)}</string><key>StandardErrorPath</key><string>${value(paths.stderrLog)}</string></dict></plist>\n`;
}

function marker(path: string, permission: "inputMonitoring" | "accessibility"): string {
  return `${path}.${permission}`;
}

async function markerExists(path: string): Promise<boolean> {
  try {
    return (await readFile(path, "utf8")).trim().startsWith("requested");
  } catch {
    return false;
  }
}

async function markerAge(path: string): Promise<number | undefined> {
  try {
    const value = Number((await readFile(path, "utf8")).trim().replace("requested:", ""));
    return Number.isFinite(value) ? Date.now() - value : undefined;
  } catch {
    return undefined;
  }
}

export function permissionState(value: boolean, wasRequested: boolean, age?: number): PermissionState {
  if (value) return "granted";
  if (age !== undefined && age < 30_000) return "notDetermined";
  return wasRequested ? "denied" : "notDetermined";
}

export function canStart(state: HelperStatus["state"], permissions: HelperStatus["permissions"]): boolean {
  return state === "stopped" && permissions.inputMonitoring === "granted" && permissions.accessibility === "granted";
}

export function repairDisposition(state: HelperStatus["state"]): "install" | "stopThenInstall" | "refuse" {
  return state === "stale" ? "stopThenInstall" : state === "identityMismatch" ? "refuse" : "install";
}

export class MacOSHelperLifecycle implements HelperController {
  constructor(
    private readonly client: NativeHelperClient,
    private readonly paths: HelperPaths,
    private readonly openURL: (url: string) => Promise<void> = async (url) => {
      await execFileAsync("/usr/bin/open", [url], { timeout: 5_000 });
    },
  ) {}

  private async exists(path: string): Promise<boolean> {
    try {
      return (await stat(path)).isFile();
    } catch {
      return false;
    }
  }

  private async identity(path: string, expectedPath?: string): Promise<CodeIdentity> {
    if (!(await this.exists(path))) return { state: "invalid", detail: "Helper executable is missing." };
    if (expectedPath) {
      try {
        if ((await lstat(path)).isSymbolicLink() || resolve(path) !== resolve(expectedPath))
          return { state: "pathMismatch", detail: "Installed helper must be the configured non-symlink path." };
        if ((await realpath(path)) !== (await realpath(expectedPath))) {
          return {
            state: "pathMismatch",
            detail: "Installed helper path does not match the required application-support location.",
          };
        }
      } catch {
        return { state: "pathMismatch", detail: "Installed helper path could not be resolved." };
      }
    }
    try {
      await execFileAsync("/usr/bin/codesign", ["--verify", "--strict", "--verbose=2", path], { timeout: 5_000 });
      const { stdout, stderr } = await execFileAsync("/usr/bin/codesign", ["-dv", "--verbose=4", path], {
        timeout: 5_000,
      });
      const inspected = inspectCodesignIdentity(`${stdout}\n${stderr}`, path, expectedPath);
      if (inspected.state !== "valid") return inspected;
      return {
        ...inspected,
        sha256: createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      };
    } catch {
      return { state: "invalid", detail: "Helper code signature could not be verified." };
    }
  }

  private installedMatchesPackaged(packaged: CodeIdentity, installed: CodeIdentity): CodeIdentity {
    if (installed.state !== "valid") return installed;
    if (
      packaged.team !== installed.team ||
      packaged.identifier !== installed.identifier ||
      packaged.sha256 !== installed.sha256
    ) {
      return {
        state: "invalid",
        detail: "Installed helper does not match the signed packaged helper identity and bytes.",
      };
    }
    return installed;
  }

  private identityStatus(packaged: CodeIdentity, installed: "notInstalled" | CodeIdentity): HelperIdentityStatus {
    return {
      packaged: packaged.state === "valid" ? "valid" : "invalid",
      installed: installed === "notInstalled" ? "notInstalled" : installed.state,
      detail:
        packaged.state !== "valid"
          ? packaged.detail
          : installed === "notInstalled"
            ? "Helper is not installed."
            : installed.detail,
    };
  }

  private invalidIdentity(
    state: "packagedIdentityInvalid" | "installedIdentityInvalid",
    identity: HelperIdentityStatus,
  ): OperationResult<HelperStatus> {
    return {
      status: "succeeded",
      value: {
        state,
        detail: identity.detail,
        identity,
        permissions: { inputMonitoring: "unavailable", accessibility: "unavailable" },
      },
    };
  }

  private async permissionStatus(access: RawAccessStatus): Promise<HelperStatus["permissions"]> {
    const [inputRequested, accessibilityRequested] = await Promise.all([
      markerExists(marker(this.paths.permissionMarker, "inputMonitoring")),
      markerExists(marker(this.paths.permissionMarker, "accessibility")),
    ]);
    const [inputAge, accessibilityAge] = await Promise.all([
      markerAge(marker(this.paths.permissionMarker, "inputMonitoring")),
      markerAge(marker(this.paths.permissionMarker, "accessibility")),
    ]);
    return {
      inputMonitoring: permissionState(access.inputMonitoring, inputRequested, inputAge),
      accessibility: permissionState(access.accessibility, accessibilityRequested, accessibilityAge),
    };
  }

  async status(): Promise<OperationResult<HelperStatus>> {
    const packaged = await this.identity(this.client.packagedPath);
    if (packaged.state !== "valid")
      return this.invalidIdentity("packagedIdentityInvalid", this.identityStatus(packaged, "notInstalled"));
    if (!(await this.exists(this.paths.installedExecutable))) {
      return {
        status: "succeeded",
        value: {
          state: "notInstalled",
          identity: this.identityStatus(packaged, "notInstalled"),
          permissions: { inputMonitoring: "notDetermined", accessibility: "notDetermined" },
        },
      };
    }
    const installed = this.installedMatchesPackaged(
      packaged,
      await this.identity(this.paths.installedExecutable, this.paths.installedExecutable),
    );
    const identity = this.identityStatus(packaged, installed);
    if (installed.state !== "valid") return this.invalidIdentity("installedIdentityInvalid", identity);
    const [runtime, access] = await Promise.all([
      this.client.runtimeStatus(),
      this.client.access(this.paths.installedExecutable),
    ]);
    if (runtime.status !== "succeeded") return runtime;
    if (access.status !== "succeeded") return access;
    return {
      status: "succeeded",
      value: { ...runtime.value, identity, permissions: await this.permissionStatus(access.value) },
    };
  }

  async install(): Promise<OperationResult<HelperStatus>> {
    const helperTemporary = `${this.paths.installedExecutable}.tmp-${process.pid}`;
    const plistTemporary = `${this.paths.launchAgent}.tmp-${process.pid}`;
    try {
      const packaged = await this.identity(this.client.packagedPath);
      if (packaged.state !== "valid")
        return this.invalidIdentity("packagedIdentityInvalid", this.identityStatus(packaged, "notInstalled"));
      await mkdir(dirname(this.paths.installedExecutable), { recursive: true });
      await mkdir(dirname(this.paths.launchAgent), { recursive: true });
      await mkdir(dirname(this.paths.stdoutLog), { recursive: true });
      await copyFile(this.client.packagedPath, helperTemporary);
      await chmod(helperTemporary, 0o755);
      const copied = this.installedMatchesPackaged(packaged, await this.identity(helperTemporary));
      if (copied.state !== "valid")
        return this.invalidIdentity("packagedIdentityInvalid", this.identityStatus(copied, "notInstalled"));
      await rename(helperTemporary, this.paths.installedExecutable);
      const installed = this.installedMatchesPackaged(
        packaged,
        await this.identity(this.paths.installedExecutable, this.paths.installedExecutable),
      );
      if (installed.state !== "valid")
        return this.invalidIdentity("installedIdentityInvalid", this.identityStatus(packaged, installed));
      await writeFile(plistTemporary, launchAgentPlist(this.paths), { mode: 0o600 });
      await rename(plistTemporary, this.paths.launchAgent);
      return this.status();
    } catch (error) {
      return { status: "failed", error: commandErrorMessage(error) };
    } finally {
      // Renamed files no longer exist; cleanup failures never obscure the install result.
      await Promise.all([
        unlink(helperTemporary).catch(() => undefined),
        unlink(plistTemporary).catch(() => undefined),
      ]);
    }
  }

  private async launchAgentPrintState(service: string): Promise<{ state: LaunchAgentPrintState; error?: string }> {
    try {
      await execFileAsync("/bin/launchctl", ["print", service], { timeout: 5_000 });
      return { state: "present" };
    } catch (error) {
      const message = commandErrorMessage(error);
      return classifyLaunchctlPrintFailure(message) === "missing"
        ? { state: "missing" }
        : { state: "failed", error: message };
    }
  }

  async start(): Promise<OperationResult<HelperStatus>> {
    const current = await this.status();
    if (current.status !== "succeeded") return current;
    if (current.value.state !== "stopped")
      return {
        status: "unavailable",
        reason: "Helper is not installed and stopped with a valid identity.",
        recovery: "Complete helper setup first.",
      };
    if (!canStart(current.value.state, current.value.permissions)) {
      return {
        status: "permission_required",
        permission: "Input Monitoring and Accessibility",
        recovery: "Grant both macOS permissions before starting the helper.",
      };
    }
    try {
      const domain = `gui/${process.getuid?.() ?? 0}`;
      const service = `${domain}/${this.paths.label}`;
      const probe = await this.launchAgentPrintState(service);
      if (probe.state === "failed") return { status: "failed", error: probe.error ?? "Could not inspect LaunchAgent." };
      if (probe.state === "missing")
        await execFileAsync("/bin/launchctl", ["bootstrap", domain, this.paths.launchAgent], { timeout: 5_000 });
      await execFileAsync("/bin/launchctl", ["kickstart", "-k", service], { timeout: 5_000 });
      return this.status();
    } catch (error) {
      return { status: "failed", error: commandErrorMessage(error) };
    }
  }

  async stop(): Promise<OperationResult<HelperStatus>> {
    const current = await this.status();
    if (current.status !== "succeeded") return current;
    if (!["running", "stale", "identityMismatch"].includes(current.value.state))
      return {
        status: "unavailable",
        reason: "No valid installed helper process can be stopped.",
        recovery: "Refresh status or repair the helper.",
      };
    const domain = `gui/${process.getuid?.() ?? 0}`;
    try {
      await execFileAsync("/bin/launchctl", ["bootout", `${domain}/${this.paths.label}`], { timeout: 5_000 });
    } catch (error) {
      const message = commandErrorMessage(error);
      if (!message.includes("Could not find service") && !message.includes("No such process"))
        return { status: "failed", error: message };
    }
    const dispatched = await this.client.stop();
    if (dispatched.status !== "succeeded") return dispatched;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const after = await this.status();
      if (after.status !== "succeeded") return after;
      if (after.value.state !== "running") return after;
    }
    return { status: "failed", error: "Helper did not stop within one second." };
  }

  async repair(): Promise<OperationResult<HelperStatus>> {
    const current = await this.status();
    if (current.status !== "succeeded") return current;
    if (repairDisposition(current.value.state) === "refuse")
      return {
        status: "unavailable",
        reason: "The running process ownership cannot be proven.",
        recovery: "Stop the mismatched process manually, then refresh before repairing.",
      };
    if (repairDisposition(current.value.state) === "stopThenInstall") {
      const stopped = await this.stop();
      if (stopped.status !== "succeeded") return stopped;
    }
    return this.install();
  }

  async requestPermissions(): Promise<OperationResult<HelperStatus>> {
    const current = await this.status();
    if (current.status !== "succeeded") return current;
    if (!["stopped", "running"].includes(current.value.state))
      return {
        status: "unavailable",
        reason: current.value.detail ?? "A signed installed helper is required.",
        recovery: "Resolve the signed-helper setup blocker first.",
      };
    const access = await this.client.access(this.paths.installedExecutable, true);
    if (access.status !== "succeeded") return access;
    await mkdir(dirname(this.paths.permissionMarker), { recursive: true });
    await Promise.all([
      access.value.inputMonitoring
        ? Promise.resolve()
        : writeFile(marker(this.paths.permissionMarker, "inputMonitoring"), `requested:${Date.now()}\n`, {
            mode: 0o600,
          }),
      access.value.accessibility
        ? Promise.resolve()
        : writeFile(marker(this.paths.permissionMarker, "accessibility"), `requested:${Date.now()}\n`, { mode: 0o600 }),
    ]);
    return this.status();
  }

  async openInputMonitoringSettings(): Promise<OperationResult<void>> {
    try {
      await this.openURL(inputMonitoringSettingsURL);
      return { status: "succeeded", value: undefined };
    } catch (error) {
      return { status: "failed", error: commandErrorMessage(error) };
    }
  }

  async openAccessibilitySettings(): Promise<OperationResult<void>> {
    try {
      await this.openURL(accessibilitySettingsURL);
      return { status: "succeeded", value: undefined };
    } catch (error) {
      return { status: "failed", error: commandErrorMessage(error) };
    }
  }
}
