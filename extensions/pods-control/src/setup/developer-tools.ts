import { execFile } from "child_process";
import { accessSync, constants } from "fs";

export type DeveloperToolsStatus = "ready" | "missing" | "unavailable";

export async function detectDeveloperTools(): Promise<DeveloperToolsStatus> {
  try {
    accessSync("/usr/bin/xcode-select", constants.X_OK);
  } catch {
    return "unavailable";
  }

  // Check the selected toolchain before xcrun so detection never opens an installer.
  if (!(await succeeds("/usr/bin/xcode-select", ["-p"]))) return "missing";
  const checks = await Promise.all([
    succeeds("/usr/bin/xcrun", ["swiftc", "--version"]),
    succeeds("/usr/bin/xcrun", ["clang", "--version"]),
  ]);
  return checks.every(Boolean) ? "ready" : "missing";
}

function succeeds(file: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: 15000 }, (error) => resolve(!error));
  });
}
