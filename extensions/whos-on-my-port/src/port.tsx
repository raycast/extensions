import { useEffect, useMemo, useState } from "react";
import { ActionPanel, List, Action, Icon, showToast, Toast, Alert, confirmAlert } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface PortOwnerEntry {
  protocol: "TCP" | "UDP";
  localAddress: string;
  localPort: string;
  pid: string;
  processName: string;
  state?: string; // e.g., LISTENING (TCP)
}

function extractPortFromAddress(address: string): string | null {
  // Handles IPv4 (127.0.0.1:3000) and IPv6 ([::]:3000 or [fe80::1%3]:5353)
  const portMatch = address.match(/:(\d+)$/);
  return portMatch ? portMatch[1] : null;
}

async function runWindowsCommand(command: string): Promise<string> {
  const fullCommand = `chcp 65001 > nul && ${command}`;
  const { stdout, stderr } = await execAsync(fullCommand, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 15000,
  });
  if (stderr && !/Active code page/i.test(stderr)) {
    // Non-fatal warnings can appear; keep silent unless it's not the codepage line
    // console.warn("stderr:", stderr);
  }
  return stdout.trim();
}

function parseWindowsCSV(csvOutput: string): string[][] {
  return csvOutput
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const parts: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          parts.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      parts.push(current.trim());
      return parts;
    })
    .filter((cols) => cols.length > 0 && cols[0]);
}

async function getPidToProcessNameMap(): Promise<Record<string, string>> {
  // Use tasklist CSV, no headers
  const output = await runWindowsCommand("tasklist /fo csv /nh");
  const rows = parseWindowsCSV(output);
  const map: Record<string, string> = {};
  for (const row of rows) {
    // Expected columns: Image Name, PID, Session Name, Session#, Mem Usage
    const image = row[0] || "";
    const pid = row[1] || "";
    if (pid) {
      map[pid] = image;
    }
  }
  return map;
}

async function killProcessByPid(pid: string): Promise<void> {
  // Force terminate the specific PID
  await runWindowsCommand(`taskkill /PID ${pid} /F`);
}

function parseNetstatLine(line: string): Omit<PortOwnerEntry, "processName" | "localPort"> | null {
  // Example TCP line:
  // TCP    0.0.0.0:135            DESKTOP:0              LISTENING       1124
  // Example UDP line:
  // UDP    0.0.0.0:5353           *:*                                   1234
  const parts = line.trim().split(/\s+/);
  if (parts.length < 4) return null;
  const protocol = parts[0];
  if (protocol !== "TCP" && protocol !== "UDP") return null;
  const localAddress = parts[1];
  if (protocol === "TCP") {
    if (parts.length < 5) return null;
    const state = parts[3];
    const pid = parts[4];
    return { protocol, localAddress, pid, state };
  }
  // UDP has no state column; format: UDP local foreign pid
  const pid = parts[3];
  return { protocol, localAddress, pid };
}

async function getListeningPorts(): Promise<PortOwnerEntry[]> {
  const [netstatOutput, pidNameMap] = await Promise.all([runWindowsCommand("netstat -ano"), getPidToProcessNameMap()]);

  const lines = netstatOutput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && /^(TCP|UDP)\s+/i.test(l));

  const entries: PortOwnerEntry[] = [];
  for (const line of lines) {
    const parsed = parseNetstatLine(line);
    if (!parsed) continue;

    if (parsed.protocol === "TCP") {
      if (parsed.state !== "LISTENING") continue; // only list listening TCP ports
    }
    // For UDP, include all

    const localPort = extractPortFromAddress(parsed.localAddress);
    if (!localPort) continue;

    const processName = pidNameMap[parsed.pid] || "Unknown";
    entries.push({
      protocol: parsed.protocol,
      localAddress: parsed.localAddress,
      localPort,
      pid: parsed.pid,
      processName,
      state: parsed.state,
    });
  }

  // Deduplicate by protocol:port:pid to avoid duplicates from multiple addresses collapsing
  const seen = new Set<string>();
  const deduped: PortOwnerEntry[] = [];
  for (const e of entries) {
    const key = `${e.protocol}:${e.localPort}:${e.pid}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(e);
    }
  }
  // Sort by numeric port
  deduped.sort((a, b) => parseInt(a.localPort) - parseInt(b.localPort));
  return deduped;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<PortOwnerEntry[]>([]);
  const [searchText, setSearchText] = useState("");

  async function refresh() {
    try {
      setIsLoading(true);
      const data = await getListeningPorts();
      setEntries(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load ports",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!searchText) return entries;
    const q = searchText.toLowerCase();
    return entries.filter(
      (e) => e.localPort.includes(q) || e.processName.toLowerCase().includes(q) || e.pid.includes(q),
    );
  }, [entries, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by port, process, or PID..."
      throttle
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No listening ports found"
          description={searchText ? `No matches for "${searchText}"` : "No listening ports detected"}
        />
      ) : (
        filtered.map((e) => (
          <List.Item
            key={`${e.protocol}-${e.localPort}-${e.pid}`}
            icon={e.protocol === "TCP" ? Icon.Network : Icon.Globe}
            title={`Port ${e.localPort}`}
            subtitle={`${e.protocol}${e.state ? ` • ${e.state}` : ""}`}
            accessories={[{ text: e.processName }, { tag: { value: `PID ${e.pid}`, color: "#6E6E73" } }]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Kill Process"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Kill Process",
                      message: `Are you sure you want to kill PID ${e.pid} (${e.processName})?`,
                      primaryAction: { title: "Kill Process", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    try {
                      await killProcessByPid(e.pid);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Process Killed",
                        message: `${e.processName} (PID ${e.pid}) terminated`,
                      });
                      await refresh();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to Kill Process",
                        message: error instanceof Error ? error.message : "Unknown error",
                      });
                    }
                  }}
                />
                <Action.CopyToClipboard title="Copy to Clipboard" content={e.localPort} />
                <Action.CopyToClipboard title="Copy to Clipboard" content={e.processName} />
                <Action.CopyToClipboard title="Copy to Clipboard" content={e.pid} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
