import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { extractPortFromEndpoint, sortPortRows } from "../port-rows";
import type { PortProcess } from "../types";

const execFileAsync = promisify(execFile);

export async function scanPortsDarwin(): Promise<PortProcess[]> {
  const { stdout } = await execFileAsync("/usr/sbin/lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-F", "pcPn"], {
    maxBuffer: 10 * 1024 * 1024,
  });
  return parseLsofOutput(stdout);
}

export function parseLsofOutput(output: string): PortProcess[] {
  let currentPID: number | undefined;
  let currentCommand = "Unknown";
  let currentProtocol = "TCP";
  const rows: PortProcess[] = [];
  const seen = new Set<string>();

  for (const rawLine of output.split("\n")) {
    if (rawLine.length === 0) {
      continue;
    }

    const marker = rawLine[0];
    const value = rawLine.slice(1);

    switch (marker) {
      case "p":
        currentPID = Number.parseInt(value, 10);
        currentCommand = "Unknown";
        currentProtocol = "TCP";
        break;
      case "c":
        currentCommand = value.length > 0 ? value : "Unknown";
        break;
      case "P":
        currentProtocol = value.length > 0 ? value : "TCP";
        break;
      case "n": {
        if (currentPID === undefined || Number.isNaN(currentPID)) {
          break;
        }

        const port = extractPortFromEndpoint(value);
        if (port === undefined) {
          break;
        }

        const uniqueKey = `${currentPID}-${port}-${value}`;
        if (seen.has(uniqueKey)) {
          break;
        }
        seen.add(uniqueKey);

        rows.push({
          id: uniqueKey,
          port,
          processName: currentCommand,
          pid: currentPID,
          endpoint: value,
          protocolName: currentProtocol,
        });
        break;
      }
      default:
        break;
    }
  }

  return sortPortRows(rows);
}
