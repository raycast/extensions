import { exec } from "child_process";
import { promisify } from "util";
import { Icon } from "@raycast/api";
import { ISOLATED_MACHINES_VERSION, parseOrbctlVersion } from "./orbstack";

export function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "running":
      return { source: Icon.CircleProgress, tintColor: "green" };
    case "stopped":
      return { source: Icon.Stop, tintColor: "red" };
    case "paused":
      return { source: Icon.Pause, tintColor: "yellow" };
    default:
      return { source: Icon.QuestionMark, tintColor: "gray" };
  }
}

export const execAsync = promisify(exec);

function isVersionAtLeast(currentVersion: string, minimumVersion: string): boolean {
  const [currMajor = 0, currMinor = 0, currPatch = 0] = currentVersion.split(".").map(Number);
  const [minMajor = 0, minMinor = 0, minPatch = 0] = minimumVersion.split(".").map(Number);

  if ([currMajor, currMinor, currPatch, minMajor, minMinor, minPatch].some(isNaN)) {
    throw new Error("Version strings must be in the format 'x.y.z'");
  }

  if (currMajor !== minMajor) return currMajor > minMajor;
  if (currMinor !== minMinor) return currMinor > minMinor;
  return currPatch >= minPatch;
}

export function supportsIsolatedMachines(versionOutput: string): boolean {
  const version = parseOrbctlVersion(versionOutput);
  return version ? isVersionAtLeast(version, ISOLATED_MACHINES_VERSION) : false;
}
