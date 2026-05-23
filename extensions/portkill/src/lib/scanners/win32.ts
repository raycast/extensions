import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { extractPortFromEndpoint, sortPortRows } from "../port-rows";
import type { PortProcess } from "../types";

const execFileAsync = promisify(execFile);

export async function scanPortsWindows(): Promise<PortProcess[]> {
  const { stdout } = await execFileAsync("netstat", ["-ano"], {
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });

  const rows = parseNetstatOutput(stdout);
  const processNames = await fetchProcessNames([...new Set(rows.map((row) => row.pid))]);

  return sortPortRows(
    rows.map((row) => ({
      ...row,
      processName: processNames.get(row.pid) ?? row.processName,
    })),
  );
}

export function parseNetstatOutput(output: string): PortProcess[] {
  const rows: PortProcess[] = [];
  const seen = new Set<string>();

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("TCP")) {
      continue;
    }

    const parts = line.split(/\s+/);
    const listeningIndex = parts.indexOf("LISTENING");
    if (listeningIndex === -1 || listeningIndex + 1 >= parts.length) {
      continue;
    }

    const pid = Number.parseInt(parts[listeningIndex + 1] ?? "", 10);
    const localAddress = parts[1];
    if (!localAddress || Number.isNaN(pid) || pid <= 0) {
      continue;
    }

    const port = extractPortFromEndpoint(localAddress);
    if (port === undefined) {
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
      processName: "Unknown",
      pid,
      endpoint,
      protocolName: "TCP",
    });
  }

  return rows;
}

async function fetchProcessNames(pids: number[]): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  if (pids.length === 0) {
    return names;
  }

  try {
    const { stdout } = await execFileAsync("tasklist", ["/FO", "CSV", "/NH"], {
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    const wanted = new Set(pids);

    for (const line of stdout.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        continue;
      }

      const match = trimmed.match(/^"([^"]*)","(\d+)"/);
      if (!match) {
        continue;
      }

      const [, processName, pidText] = match;
      const pid = Number.parseInt(pidText, 10);
      if (!wanted.has(pid)) {
        continue;
      }

      names.set(pid, processName.length > 0 ? processName.replace(/\.exe$/i, "") : "Unknown");
    }
  } catch {
    return names;
  }

  return names;
}
