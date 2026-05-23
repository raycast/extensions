import { isLinux, isMac, isWindows } from "./platform";
import { scanPortsDarwin, parseLsofOutput } from "./scanners/darwin";
import { scanPortsLinux } from "./scanners/linux";
import { scanPortsWindows } from "./scanners/win32";
import type { PortProcess } from "./types";

export class PortScannerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortScannerError";
  }
}

export async function scanPorts(): Promise<PortProcess[]> {
  try {
    if (isMac) {
      return await scanPortsDarwin();
    }
    if (isWindows) {
      return await scanPortsWindows();
    }
    if (isLinux) {
      return await scanPortsLinux();
    }

    throw new PortScannerError("Port scanning is only supported on macOS, Windows, and Linux.");
  } catch (error) {
    if (error instanceof PortScannerError) {
      throw error;
    }

    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    const output = err.stdout?.trim() ?? "";
    if (isMac && output.length > 0) {
      return parseLsofOutput(output);
    }

    const stderr = err.stderr?.trim();
    const message = stderr && stderr.length > 0 ? stderr : err.message || "Port scan failed";
    throw new PortScannerError(message);
  }
}
