import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { extractPortFromEndpoint, sortPortRows } from "../port-rows";
import type { PortProcess } from "../types";
import { parseLsofOutput } from "./darwin";

const execFileAsync = promisify(execFile);

export async function scanPortsLinux(): Promise<PortProcess[]> {
  try {
    const rows = await scanWithSs();
    if (rows.length > 0) {
      return rows;
    }
  } catch {
    // Fall back to lsof when ss is unavailable or returns no process metadata.
  }

  const { stdout } = await execFileAsync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-F", "pcPn"], {
    maxBuffer: 10 * 1024 * 1024,
  });
  return parseLsofOutput(stdout);
}

async function scanWithSs(): Promise<PortProcess[]> {
  const { stdout } = await execFileAsync("ss", ["-H", "-tlnp"], {
    maxBuffer: 10 * 1024 * 1024,
  });
  return parseSsOutput(stdout);
}

export function parseSsOutput(output: string): PortProcess[] {
  const rows: PortProcess[] = [];
  const seen = new Set<string>();

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("LISTEN")) {
      continue;
    }

    const parts = line.split(/\s+/);
    const localAddress = parts[3];
    if (!localAddress) {
      continue;
    }

    const port = extractPortFromEndpoint(localAddress);
    if (port === undefined) {
      continue;
    }

    const processMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
    const processName = processMatch?.[1] ?? "Unknown";
    const pid = processMatch ? Number.parseInt(processMatch[2], 10) : 0;
    if (Number.isNaN(pid)) {
      continue;
    }

    if (pid <= 0) {
      continue;
    }

    const endpoint = localAddress;
    const uniqueKey = `${pid}-${port}-${endpoint}`;
    if (seen.has(uniqueKey)) {
      continue;
    }
    seen.add(uniqueKey);

    rows.push({
      id: uniqueKey,
      port,
      processName,
      pid,
      endpoint,
      protocolName: "TCP",
    });
  }

  return sortPortRows(rows);
}
