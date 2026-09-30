import { exec, execFile } from "child_process";
import { promisify } from "util";

export const execAsync = promisify(exec);
export const execFileAsync = promisify(execFile);

export interface Distro {
  name: string;
  state: string;
  version: string;
  isDefault: boolean;
}

export function parseDistros(output: string): Distro[] {
  const cleanOutput = output.replace(/\0/g, "");

  const lines = cleanOutput
    .split("\r\n")
    .filter((line) => line.trim() !== "")
    .slice(1);

  return lines.map((line) => {
    const parts = line.trim().split(/\s{2,}/);

    let name = parts[0];
    let isDefault = false;
    if (name.startsWith("*")) {
      isDefault = true;
      name = name.substring(1).trim();
    }

    return {
      name: name,
      state: parts[1] || "Unknown",
      version: parts[2] || "?",
      isDefault,
    };
  });
}

export interface OnlineDistro {
  name: string;
  friendlyName: string;
}

export function parseOnlineDistros(output: string): OnlineDistro[] {
  const cleanOutput = output.replace(/\0/g, "");
  const lines = cleanOutput.split("\r\n").filter((line) => line.trim() !== "");

  return lines
    .filter((line) => {
      // Filter out usage instructions and headers
      const l = line.trim();
      if (l.startsWith("The following is a list")) return false;
      if (l.startsWith("Install using")) return false;
      if (l.startsWith("NAME")) return false;
      return true;
    })
    .map((line) => {
      // Split by at least 2 spaces to separate NAME and FRIENDLY NAME
      const parts = line.trim().split(/\s{2,}/);
      return {
        name: parts[0],
        friendlyName: parts[1] || parts[0],
      };
    });
}
