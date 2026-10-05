import {
  executeCommand as executeCommandInSwift,
  getRunningApplications as getRunningApplicationsInSwift,
  requestAccessibilityPermission as requestAccessibilityPermissionInSwift,
  scanInterfaceCommands as scanInterfaceCommandsInSwift,
  scanMenuCommands as scanMenuCommandsInSwift,
} from "swift:../swift";

export type CommandSource = "menu" | "interface";

export interface RunningApplication {
  pid: number;
  name: string;
  bundleIdentifier?: string;
  path?: string;
}

export interface ApplicationsResponse {
  trusted: boolean;
  defaultPid?: number;
  applications: RunningApplication[];
}

export interface FastNavCommand {
  id: string;
  pid: number;
  appName: string;
  bundleIdentifier?: string;
  title: string;
  menuPath: string[];
  shortcut?: string;
  isEnabled: boolean;
  order: number;
  source: CommandSource;
  role?: string;
  action: string;
  focusedApplicationBonusEmpty?: number;
  focusedApplicationBonusSearch?: number;
  isWebBacked?: boolean;
  accessibilityLocator?: string;
}

export async function getRunningApplications(): Promise<ApplicationsResponse> {
  return (await getRunningApplicationsInSwift()) as ApplicationsResponse;
}

export async function scanMenuCommands(pid: number): Promise<FastNavCommand[]> {
  return (await scanMenuCommandsInSwift(pid)) as FastNavCommand[];
}

export async function scanInterfaceCommands(
  pid: number,
): Promise<FastNavCommand[]> {
  return (await scanInterfaceCommandsInSwift(pid)) as FastNavCommand[];
}

export async function requestAccessibilityPermission(): Promise<{
  trusted: boolean;
}> {
  return (await requestAccessibilityPermissionInSwift(true)) as {
    trusted: boolean;
  };
}

export async function executeCommand(
  command: FastNavCommand,
): Promise<{ ok: boolean }> {
  return (await executeCommandInSwift(command)) as { ok: boolean };
}
