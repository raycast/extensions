import { accessSync, constants } from "node:fs";
import { getPeonPingStatus, type PeonPingStatus } from "./peon-ping-config";
import type { PeonPingResolvedPaths } from "./peon-ping-paths";

export type PeonPingCommandRunner = (
  command: string,
  args: readonly string[],
) => string;

export type TogglePeonPingResult = {
  message: string;
  status: PeonPingStatus;
};

function isENOENT(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export function togglePeonPing(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
): TogglePeonPingResult {
  try {
    accessSync(paths.scriptPath, constants.F_OK);
  } catch (e) {
    if (isENOENT(e)) {
      throw new Error(`peon-ping is not installed at ${paths.scriptPath}`);
    }
    throw e;
  }
  let stdout: string;
  try {
    stdout = run("bash", [paths.scriptPath, "toggle"]);
  } catch (e) {
    if (isENOENT(e)) {
      throw new Error(`peon-ping is not installed at ${paths.scriptPath}`);
    }
    throw e;
  }
  return {
    message: stdout.trim(),
    status: getPeonPingStatus(paths.configFilePath, paths.pausedFilePath),
  };
}
