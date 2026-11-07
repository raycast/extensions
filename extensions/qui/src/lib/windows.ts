import path from "node:path";
import { runPowerShellScript } from "@raycast/utils";
import type { ListeningPort, ProcessInfo } from "~/lib/types";

interface WinConn {
  LocalAddress: string;
  LocalPort: number;
  OwningProcess: number;
}

interface WinProc {
  ProcessId: number;
  ParentProcessId: number;
  Name: string | null;
  CommandLine: string | null;
  ExecutablePath: string | null;
  Elapsed: number | null;
  WorkingSetSize: number | null;
}

// One PowerShell round-trip: listening sockets (IP Helper tables, like witr)
// plus every process for names, command lines and ancestry.
//
// runPowerShellScript feeds the script through stdin (`-Command -`), where
// PowerShell runs it line by line, so every statement stays on one line.
const SCRIPT = [
  "$ErrorActionPreference = 'SilentlyContinue'",
  "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
  "$now = Get-Date",
  "$c = @(Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess)",
  "$p = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CommandLine, ExecutablePath, WorkingSetSize, @{ n = 'Elapsed'; e = { if ($_.CreationDate) { [int64]($now - $_.CreationDate).TotalSeconds } else { $null } } })",
  "ConvertTo-Json -InputObject @{ c = $c; p = $p } -Depth 3 -Compress",
].join("\n");

export async function listListeningPortsWindows(): Promise<ListeningPort[]> {
  const out = await runPowerShellScript(SCRIPT, { timeout: 20_000 });
  const data = JSON.parse(out) as { c: WinConn[] | null; p: WinProc[] | null };
  const procs = new Map((data.p ?? []).map((p) => [p.ProcessId, p]));

  const byKey = new Map<string, ListeningPort>();
  for (const conn of data.c ?? []) {
    const pid = conn.OwningProcess;
    // PID 0/4 are the idle and kernel "System" processes; nothing to kill.
    if (pid <= 4) continue;
    const id = `${pid}:${conn.LocalPort}`;
    const address = conn.LocalAddress === "0.0.0.0" || conn.LocalAddress === "::" ? "*" : conn.LocalAddress;
    const existing = byKey.get(id);
    if (existing) {
      if (!existing.addresses.includes(address)) existing.addresses.push(address);
      continue;
    }
    byKey.set(id, { id, port: conn.LocalPort, protocol: "TCP", addresses: [address], process: toProcess(pid, procs) });
  }
  return [...byKey.values()].sort((a, b) => a.port - b.port || a.process.pid - b.process.pid);
}

function toProcess(pid: number, procs: Map<number, WinProc>): ProcessInfo {
  const p = procs.get(pid);
  const name = p?.Name ? p.Name.replace(/\.exe$/i, "") : `PID ${pid}`;
  return {
    pid,
    ppid: p?.ParentProcessId ?? 0,
    name,
    command: p?.CommandLine || p?.ExecutablePath || name,
    executable: p?.ExecutablePath ?? undefined,
    elapsedSeconds: p?.Elapsed ?? undefined,
    rssKb: p?.WorkingSetSize ? Math.round(p.WorkingSetSize / 1024) : undefined,
    ancestry: ancestryOf(pid, procs),
  };
}

function ancestryOf(pid: number, procs: Map<number, WinProc>): { pid: number; name: string }[] {
  const chain: { pid: number; name: string }[] = [];
  const seen = new Set<number>([pid]);
  let current = procs.get(pid)?.ParentProcessId;
  while (current && !seen.has(current)) {
    seen.add(current);
    const row = procs.get(current);
    // Windows reuses PIDs and never re-parents, so a parent may be long gone.
    if (!row) break;
    chain.unshift({ pid: current, name: path.win32.basename(row.Name ?? String(current)).replace(/\.exe$/i, "") });
    current = row.ParentProcessId;
  }
  return chain;
}
