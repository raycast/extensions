import { Action, ActionPanel, Icon, List, showToast, Toast, Detail, getPreferenceValues } from "@raycast/api";
import { execa } from "execa";
import pidusage from "pidusage";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

// =====================
// Error helper
// =====================
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "stderr" in err) return String((err as { stderr: unknown }).stderr);
  return String(err);
}

// =====================
// System binary paths for macOS
// =====================
const LSOF_PATH = "/usr/sbin/lsof";
const PS_PATH = "/bin/ps";
const KILL_PATH = "/bin/kill";
const CURRENT_USER = process.env.USER || "";
// Docker might be in different locations depending on installation
const DOCKER_PATHS = ["/usr/local/bin/docker", "/opt/homebrew/bin/docker", "/usr/bin/docker"];

// =====================
// Types
// =====================
export type Listener = {
  pid: number;
  cmd: string;
  user?: string;
  uid?: number;
  address: string; // e.g., 127.0.0.1 or *
  port: number;
  protocol: "tcp" | "udp";
  execPath?: string;
  cwd?: string;
  cmdline?: string;
  cpu?: number; // %
  memory?: number; // bytes
  startedAt?: string;
  // Derived, for nicer display
  displayName?: string;
};

export type DockerPort = {
  hostIp?: string; // 0.0.0.0, 127.0.0.1, ::, etc.
  hostPort?: number; // host port if published
  containerPort: number;
  protocol: string; // tcp/udp
};

export type DockerContainer = {
  id: string;
  name: string;
  image: string;
  status: string; // e.g., "Up 2 minutes"
  ports: DockerPort[];
  cpu?: number; // percent
  mem?: string; // raw string from docker stats (e.g., "123MiB / 2GiB")
};

type LsofRecord = {
  pid?: number;
  cmd?: string;
  uid?: number;
  user?: string;
  names: string[]; // each 'n' line (address:port and state)
  proto: "tcp" | "udp";
};

// =====================
// Host listeners (lsof)
// =====================
async function getListeningByProto(proto: "tcp" | "udp"): Promise<LsofRecord[]> {
  const args = proto === "tcp" ? ["-nP", "-iTCP", "-sTCP:LISTEN", "-FpcPnTuL"] : ["-nP", "-iUDP", "-FpcPnTuL"];
  const { stdout } = await execa(LSOF_PATH, args, { timeout: 4000 });
  const lines = stdout.split("\n");
  const records: LsofRecord[] = [];
  let current: LsofRecord | null = null;

  for (const line of lines) {
    if (!line) continue;
    const tag = line[0];
    const val = line.slice(1);
    if (tag === "p") {
      if (current && (current.pid || current.cmd)) records.push(current);
      current = { names: [], proto } as LsofRecord;
      const pid = Number(val);
      if (!Number.isNaN(pid)) current.pid = pid;
    } else if (!current) {
      continue;
    } else {
      switch (tag) {
        case "c":
          current.cmd = val;
          break;
        case "u": {
          const uid = Number(val);
          if (!Number.isNaN(uid)) current.uid = uid;
          break;
        }
        case "L":
          current.user = val;
          break;
        case "n":
          current.names.push(val);
          break;
      }
    }
  }
  if (current && (current.pid || current.cmd)) records.push(current);
  return records;
}

function parseAddressPort(nameLine: string): { address: string; port: number } | null {
  // name lines may be like "127.0.0.1:3000 (LISTEN)", "*:8080 (LISTEN)", "::1:53", "*:5353"
  const raw = nameLine.split(" ")[0]; // drop trailing state for TCP
  const lastColon = raw.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const address = raw.slice(0, lastColon);
  const portStr = raw.slice(lastColon + 1);
  const port = Number(portStr);
  if (Number.isNaN(port)) return null;
  return { address, port };
}

async function getCwd(pid: number): Promise<string | undefined> {
  try {
    const { stdout } = await execa(LSOF_PATH, ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], { timeout: 2500 });
    const nLine = stdout.split("\n").find((l) => l.startsWith("n"));
    return nLine ? nLine.slice(1) : undefined;
  } catch {
    return undefined;
  }
}

async function getPsInfo(
  pid: number
): Promise<{ execPath?: string; cmdline?: string; startedAt?: string; fullCommand?: string }> {
  try {
    const { stdout } = await execa(PS_PATH, ["-o", "command=,lstart=", "-p", String(pid)], { timeout: 2500 });
    const line = stdout.trim();
    if (!line) return {};

    // Try to extract lstart from the end of the line
    const match = line.match(/(.*?\S)\s{2,}([A-Z][a-z]{2}\s[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})$/);
    let execPlusArgs = line;
    let lstart = undefined as string | undefined;
    if (match) {
      execPlusArgs = match[1];
      lstart = match[2];
    }

    // Split the full command to get executable path and arguments
    const parts = execPlusArgs.split(/\s+/);
    const execPath = parts[0];
    const cmdline = parts.slice(1).join(" ");

    // Get the full command name from the executable path
    const fullCommand = basename(execPath) || execPath;

    return { execPath, cmdline, startedAt: lstart, fullCommand };
  } catch {
    return {};
  }
}

async function enrichWithStats(pids: number[]): Promise<Record<number, { cpu?: number; memory?: number }>> {
  const out: Record<number, { cpu?: number; memory?: number }> = {};
  for (const pid of pids) {
    try {
      const s = await pidusage(pid);
      out[pid] = { cpu: s.cpu, memory: s.memory };
    } catch {
      out[pid] = {};
    }
  }
  return out;
}

function formatMem(bytes?: number): string {
  if (!bytes || bytes <= 0) return "-";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function basename(p?: string) {
  if (!p) return undefined;
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

function friendlyAddress(address: string) {
  if (address === "127.0.0.1" || address === "::1") return "localhost";
  if (address === "*" || address === "0.0.0.0" || address === "::") return "all network interfaces";
  return address;
}

// Kill owners by port (supports tcp/udp)
async function killOwnersByPort(port: number, proto: "tcp" | "udp", sig: "TERM" | "KILL") {
  const selector = proto === "tcp" ? `-tiTCP:${port}` : `-tiUDP:${port}`;
  const args = [selector];
  if (proto === "tcp") args.push("-sTCP:LISTEN");
  const { stdout } = await execa(LSOF_PATH, args, { timeout: 2000 });
  const pids = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => Number(l))
    .filter((n) => !Number.isNaN(n));
  for (const pid of pids) {
    await execa(KILL_PATH, ["-" + sig, String(pid)]);
  }
  return pids.length;
}

// =====================
// Docker helpers (docker ps / stats)
// =====================
async function findDockerPath(): Promise<string | null> {
  for (const path of DOCKER_PATHS) {
    try {
      await execa(path, ["version", "--format", "{{.Server.Version}}"], { timeout: 1000 });
      return path;
    } catch {
      // Continue to next path
    }
  }
  return null;
}

async function hasDocker(): Promise<boolean> {
  const dockerPath = await findDockerPath();
  return dockerPath !== null;
}

function parseDockerPorts(portsField: string): DockerPort[] {
  if (!portsField) return [];
  return portsField
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry.includes("->")) {
        const [host, cont] = entry.split("->");
        let hostIp: string | undefined;
        let hostPort: number | undefined;
        const lastColon = host.lastIndexOf(":");
        if (lastColon !== -1) {
          hostIp = host.slice(0, lastColon).replace(/^\*$/, "0.0.0.0");
          const hp = Number(host.slice(lastColon + 1));
          if (!Number.isNaN(hp)) hostPort = hp;
        }
        const [cpStr, proto = "tcp"] = cont.split("/");
        const containerPort = Number(cpStr);
        return { hostIp, hostPort, containerPort, protocol: proto.toLowerCase() } as DockerPort;
      }
      const [cpStr, proto = "tcp"] = entry.split("/");
      const containerPort = Number(cpStr);
      return { containerPort, protocol: proto.toLowerCase() } as DockerPort;
    })
    .filter((p) => !Number.isNaN(p.containerPort));
}

async function getDockerContainers(): Promise<DockerContainer[]> {
  const dockerPath = await findDockerPath();
  if (!dockerPath) return [];

  const { stdout } = await execa(
    dockerPath,
    ["ps", "--no-trunc", "--format", "{{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Ports}}\t{{.Status}}"],
    { timeout: 3000 }
  );
  const lines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const [id, image, name, portsField, status] = line.split("\t");
    return {
      id,
      image,
      name,
      status,
      ports: parseDockerPorts(portsField || ""),
    } as DockerContainer;
  });
}

async function getDockerStatsByName(): Promise<Record<string, { cpu?: number; mem?: string }>> {
  const stats: Record<string, { cpu?: number; mem?: string }> = {};
  const dockerPath = await findDockerPath();
  if (!dockerPath) return stats;

  try {
    const { stdout } = await execa(
      dockerPath,
      ["stats", "--no-stream", "--format", "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"],
      { timeout: 3500 }
    );
    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      const [name, cpuPerc, memUsage] = line.split("\t");
      const cpu = cpuPerc?.endsWith("%") ? Number(cpuPerc.replace("%", "")) : undefined;
      stats[name] = { cpu, mem: memUsage };
    }
  } catch {
    // docker stats may fail if Docker is starting; ignore
  }
  return stats;
}

// =====================
// UI Command
// =====================
export default function Command() {
  const preferences = getPreferenceValues<Preferences.ListLocalhosts>();
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [dockerAvailable, setDockerAvailable] = useState<boolean | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View
  const [viewMode, setViewMode] = useState<"simple" | "advanced">(preferences.defaultViewMode || "simple");
  type OptionsMode = "all" | "hideSystem" | "hideZeroCPU" | "hideBoth";
  const [optionsMode, setOptionsMode] = useState<OptionsMode>("all");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Host listeners (TCP + UDP)
      const [tcp, udp] = await Promise.all([getListeningByProto("tcp"), getListeningByProto("udp")]);
      const records = [...tcp, ...udp];

      const base: Listener[] = [];
      for (const r of records) {
        for (const n of r.names) {
          // Ignore connected UDP entries like "127.0.0.1:12345->8.8.8.8:53"
          if (n.includes("->")) continue;
          const ap = parseAddressPort(n);
          if (!ap || !r.pid || !r.cmd) continue;
          base.push({
            pid: r.pid,
            cmd: r.cmd,
            user: r.user,
            uid: r.uid,
            address: ap.address,
            port: ap.port,
            protocol: r.proto,
            displayName: basename(r.cmd) || r.cmd,
          });
        }
      }

      const pids = [...new Set(base.map((b) => b.pid))];
      const [statsByPid, extraInfoList] = await Promise.all([
        enrichWithStats(pids),
        Promise.all(
          pids.map(async (pid) => {
            const [cwd, psinfo] = await Promise.all([getCwd(pid), getPsInfo(pid)]);
            return { pid, cwd, ...psinfo };
          })
        ),
      ]);
      const extraInfoByPid = Object.fromEntries(extraInfoList.map((e) => [e.pid, e]));

      const merged = base.map((b) => {
        const s = statsByPid[b.pid] || {};
        const e = extraInfoByPid[b.pid] || {};
        // Use the full command name from ps, fallback to lsof's abbreviated name
        let displayName = e.fullCommand || basename(e.execPath) || b.cmd;

        // If we still have a short abbreviated name, try to make it more readable
        if (displayName && displayName.length <= 15 && !displayName.includes("/")) {
          // Common macOS process name mappings
          const nameMap: Record<string, string> = {
            Spotify: "Spotify",
            Sp: "Spotify",
            Co: "Code",
            Vi: "Visual Studio Code",
            Go: "Google Chrome",
            Ra: "Raycast",
            On: "OneDrive",
            sha: "sharingd",
            Mi: "Microsoft Teams",
            Library: "Library Agent",
          };
          displayName = nameMap[displayName] || displayName;
        }

        return {
          ...b,
          cpu: s.cpu,
          memory: s.memory,
          execPath: e.execPath,
          cmdline: e.cmdline,
          cwd: e.cwd,
          startedAt: e.startedAt,
          displayName,
        };
      });

      merged.sort((a, b) => a.port - b.port);
      setListeners(merged);

      // Docker section
      const has = await hasDocker();
      setDockerAvailable(has);
      if (has) {
        const [list, statMap] = await Promise.all([getDockerContainers(), getDockerStatsByName()]);
        const withStats = list.map((c) => ({ ...c, cpu: statMap[c.name]?.cpu, mem: statMap[c.name]?.mem }));
        setContainers(withStats);
      } else {
        setContainers([]);
      }
    } catch (err: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Refresh failed",
        message: getErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  const hostItems = useMemo(() => {
    // De-duplicate PID+address+port+protocol
    const map = new Map<string, Listener>();
    function isSystem(l: Listener) {
      if (l.uid !== undefined && l.uid < 500) return true; // system UIDs
      if (l.user && CURRENT_USER && l.user !== CURRENT_USER) return true; // other users
      const p = l.execPath || l.cmd;
      return (
        p.startsWith("/System/") ||
        p.startsWith("/usr/sbin/") ||
        p.startsWith("/usr/libexec/") ||
        p.startsWith("/Library/CoreServices/")
      );
    }
    const hideSystem = optionsMode === "hideSystem" || optionsMode === "hideBoth";
    for (const l of listeners) {
      if (hideSystem && isSystem(l)) continue;
      map.set(`${l.pid}-${l.address}-${l.port}-${l.protocol}`, l);
    }
    return [...map.values()];
  }, [listeners, optionsMode]);

  const ViewModeDropdown = (
    <List.Dropdown
      tooltip="View Mode"
      storeValue={true}
      value={viewMode}
      onChange={(val) => setViewMode(val as "simple" | "advanced")}
    >
      <List.Dropdown.Item title="Simple View" value="simple" />
      <List.Dropdown.Item title="Advanced View" value="advanced" />
    </List.Dropdown>
  );

  const FilterDropdown = (
    <List.Dropdown
      tooltip="Filter Options"
      storeValue={true}
      value={optionsMode}
      onChange={(val) => setOptionsMode(val as OptionsMode)}
    >
      <List.Dropdown.Item title="Show everything" value="all" />
      <List.Dropdown.Item title="Hide system processes" value="hideSystem" />
      <List.Dropdown.Item title="Hide 0% CPU badges" value="hideZeroCPU" />
      <List.Dropdown.Item title="Hide system + 0% CPU" value="hideBoth" />
    </List.Dropdown>
  );

  const searchBarAccessory = (
    <Fragment>
      {ViewModeDropdown}
      {FilterDropdown}
    </Fragment>
  );

  const isAdvanced = viewMode === "advanced";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isAdvanced}
      searchBarPlaceholder="Filter by port, command, user…"
      searchBarAccessory={searchBarAccessory}
    >
      <List.Section title="Listening Ports (Host)">
        {hostItems.map((l) => (
          <List.Item
            key={`host-${l.pid}-${l.address}-${l.port}-${l.protocol}`}
            title={`:${l.port}`}
            subtitle={isAdvanced ? l.displayName || l.cmd : `${l.protocol.toUpperCase()} • ${l.displayName || l.cmd}`}
            accessories={(() => {
              const hideZero = optionsMode === "hideZeroCPU" || optionsMode === "hideBoth";
              const cpuText =
                l.cpu !== undefined && (!hideZero || (l.cpu ?? 0) > 0.05) ? `${l.cpu?.toFixed(1)}% CPU` : undefined;
              // In advanced view, show minimal info since we have the detail panel
              const base = isAdvanced
                ? [] // No accessories in advanced view - all info is in the detail panel
                : [
                    { text: `PID ${l.pid}`, tooltip: "Process ID" },
                    l.user ? { text: l.user, tooltip: "User" } : undefined,
                    cpuText ? { text: cpuText, tooltip: "CPU Usage" } : undefined,
                  ];
              return base.filter(Boolean) as { text: string }[];
            })()}
            icon={Icon.Terminal}
            actions={<HostActions listener={l} onRefresh={refresh} />}
            detail={
              isAdvanced ? (
                <List.Item.Detail
                  markdown={`Port ${l.port} on ${friendlyAddress(l.address)}\n\n${l.displayName || l.cmd}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="App / Command" text={l.displayName || l.cmd} />
                      <List.Item.Detail.Metadata.Label title="Protocol" text={l.protocol.toUpperCase()} />
                      <List.Item.Detail.Metadata.Label title="PID" text={String(l.pid)} />
                      {l.user ? <List.Item.Detail.Metadata.Label title="User" text={l.user} /> : null}
                      {l.uid !== undefined ? (
                        <List.Item.Detail.Metadata.Label title="UID" text={String(l.uid)} />
                      ) : null}
                      {l.execPath ? <List.Item.Detail.Metadata.Label title="Executable" text={l.execPath} /> : null}
                      {l.cwd ? <List.Item.Detail.Metadata.Label title="Working Dir" text={l.cwd} /> : null}
                      {l.startedAt ? <List.Item.Detail.Metadata.Label title="Started" text={l.startedAt} /> : null}
                      {l.cpu !== undefined ? (
                        <List.Item.Detail.Metadata.Label title="CPU" text={`${l.cpu?.toFixed(1)}%`} />
                      ) : null}
                      {l.memory !== undefined ? (
                        <List.Item.Detail.Metadata.Label title="Memory" text={formatMem(l.memory)} />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              ) : undefined
            }
          />
        ))}
      </List.Section>

      <List.Section title="Docker Containers">
        {dockerAvailable === false && (
          <List.Item
            title="Docker not available"
            subtitle="Install Docker Desktop and ensure the daemon is running"
            icon={Icon.Warning}
          />
        )}
        {dockerAvailable && containers.length === 0 && <List.Item title="No running containers" icon={Icon.Info} />}
        {containers.map((c) => (
          <List.Item
            key={`ctr-${c.id}`}
            title={c.name}
            subtitle={isAdvanced ? c.image : c.status}
            icon={Icon.Box}
            accessories={
              (isAdvanced
                ? [] // No accessories in advanced view - all info is in the detail panel
                : [
                    c.ports.length
                      ? {
                          text:
                            c.ports
                              .map((p) => (p.hostPort ? `${p.hostPort}` : ``))
                              .filter(Boolean)
                              .join(", ") || undefined,
                        }
                      : undefined,
                  ]
              ).filter(Boolean) as { text: string }[]
            }
            actions={<DockerActions container={c} onRefresh={refresh} />}
            detail={
              isAdvanced ? (
                <List.Item.Detail
                  markdown={`Container ${c.name} (${c.image})\n\n${c.status}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Image" text={c.image} />
                      <List.Item.Detail.Metadata.Label title="Status" text={c.status} />
                      {c.cpu !== undefined ? (
                        <List.Item.Detail.Metadata.Label title="CPU" text={`${c.cpu?.toFixed(1)}%`} />
                      ) : null}
                      {c.mem ? <List.Item.Detail.Metadata.Label title="Memory" text={c.mem} /> : null}
                      {c.ports.length ? (
                        <List.Item.Detail.Metadata.TagList title="Ports">
                          {c.ports.map((p, idx) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={idx}
                              text={
                                p.hostPort
                                  ? `${p.hostPort} → ${p.containerPort}/${p.protocol}`
                                  : `${p.containerPort}/${p.protocol}`
                              }
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              ) : undefined
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function HostActions({ listener, onRefresh }: { listener: Listener; onRefresh: () => void }) {
  const url = `http://localhost:${listener.port}`;
  async function kill(sig: "TERM" | "KILL") {
    try {
      await execa(KILL_PATH, ["-" + sig, String(listener.pid)]);
      await showToast({ style: Toast.Style.Success, title: `Sent SIG${sig} to PID ${listener.pid}` });
      onRefresh();
    } catch (err: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to kill PID ${listener.pid}`,
        message: getErrorMessage(err),
      });
    }
  }
  async function killByPort(sig: "TERM" | "KILL") {
    try {
      const count = await killOwnersByPort(listener.port, listener.protocol, sig);
      await showToast({
        style: Toast.Style.Success,
        title: `Sent SIG${sig} to ${count} owner(s) of :${listener.port}`,
      });
      onRefresh();
    } catch (err: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Kill-by-Port Failed",
        message: getErrorMessage(err),
      });
    }
  }
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={url} title={`Open ${url}`} />
      <Action.CopyToClipboard title="Copy Address" content={`${listener.address}:${listener.port}`} />
      <Action.CopyToClipboard title="Copy PID" content={String(listener.pid)} />
      <Action.CopyToClipboard title="Copy Command" content={listener.cmdline || listener.execPath || listener.cmd} />
      {listener.execPath ? <Action.ShowInFinder path={listener.execPath} title="Reveal App in Finder" /> : null}
      {listener.cwd ? <Action.Open title="Open Working Folder" target={listener.cwd} /> : null}
      <ActionPanel.Section title="Stop App (by PID)">
        <Action
          title="Stop Nicely — Recommended"
          icon={Icon.XMarkCircle}
          onAction={() => kill("TERM")}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        />
        <Action
          title="Force Stop — If Stuck"
          style={Action.Style.Destructive}
          icon={Icon.Trash}
          onAction={() => kill("KILL")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title={`Stop Whoever Uses :${listener.port}`}>
        <Action title="Stop by Port (Nice)" icon={Icon.XMarkCircle} onAction={() => killByPort("TERM")} />
        <Action
          title="Stop by Port (Force)"
          style={Action.Style.Destructive}
          icon={Icon.Trash}
          onAction={() => killByPort("KILL")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push title="Help & Glossary" icon={Icon.QuestionMark} target={<Help />} />
        <Action title="Refresh" icon={Icon.RotateClockwise} onAction={onRefresh} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function DockerActions({ container, onRefresh }: { container: DockerContainer; onRefresh: () => void }) {
  async function stop() {
    const dockerPath = await findDockerPath();
    if (!dockerPath) return;

    try {
      await execa(dockerPath, ["stop", container.id]);
      await showToast({ style: Toast.Style.Success, title: `Stopped ${container.name}` });
      onRefresh();
    } catch (err: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to stop ${container.name}`,
        message: getErrorMessage(err),
      });
    }
  }
  async function start() {
    const dockerPath = await findDockerPath();
    if (!dockerPath) return;

    try {
      await execa(dockerPath, ["start", container.id]);
      await showToast({ style: Toast.Style.Success, title: `Started ${container.name}` });
      onRefresh();
    } catch (err: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to start ${container.name}`,
        message: getErrorMessage(err),
      });
    }
  }
  async function restart() {
    const dockerPath = await findDockerPath();
    if (!dockerPath) return;

    try {
      await execa(dockerPath, ["restart", container.id]);
      await showToast({ style: Toast.Style.Success, title: `Restarted ${container.name}` });
      onRefresh();
    } catch (err: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to restart ${container.name}`,
        message: getErrorMessage(err),
      });
    }
  }

  const openable = container.ports.filter((p) => p.hostPort);

  return (
    <ActionPanel>
      {openable.length > 0 ? (
        <ActionPanel.Section title="Open Published Ports">
          {openable.map((p) => (
            <Action.OpenInBrowser
              key={`open-${container.id}-${p.hostPort}`}
              url={`http://localhost:${p.hostPort}`}
              title={`Open http://localhost:${p.hostPort}`}
            />
          ))}
        </ActionPanel.Section>
      ) : null}
      <Action.CopyToClipboard title="Copy Container Name" content={container.name} />
      <Action.CopyToClipboard title="Copy Container ID" content={container.id} />
      <Action.CopyToClipboard title="Copy Image" content={container.image} />
      <ActionPanel.Section title="Lifecycle">
        <Action title="Stop" icon={Icon.Stop} onAction={stop} />
        <Action title="Start" icon={Icon.Play} onAction={start} />
        <Action title="Restart" icon={Icon.RotateClockwise} onAction={restart} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action title="Refresh" icon={Icon.RotateClockwise} onAction={onRefresh} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function Help() {
  const md = `# Localhost Manager — Help

What you are seeing
- A list of apps on your Mac that are “listening” for connections. Each one owns a port (like 3000) and a process (PID).

Key terms (in plain English)
- Port: A door number that apps use (e.g., 3000). The same app can use multiple ports.
- Protocol: TCP or UDP. Most web/dev servers use TCP.
- PID: The unique number of the running app. The fastest way to stop exactly that app.
- User: Which macOS user started the app.
- UID: The numeric form of the user. You can ignore this unless you know you need it.

Stopping things — which action should I use?
- Stop nicely — recommended: Sends SIGTERM. It politely asks the app to shut down and clean up. Try this first.
- Force stop — if stuck: Sends SIGKILL. Instantly stops the app without cleanup. Use only if “Stop nicely” didn’t work.
- Stop by port: When you only care about freeing a port (say :3000) and don’t know the exact process, this targets whoever is using that port. There is a nice and a force variant, same rules as above.

Open in browser
- Quickly opens http://localhost:<port>. Works for HTTP services.

Simple vs Advanced view
- Simple: Minimal info, fewer distractions.
- Advanced: Full details (address, UID, paths, CPU/memory) with a right‑hand panel.

Options
- Hide system processes: hides background macOS daemons and other-user processes.
- Hide 0% CPU badges: removes the “0.0% CPU” accessory to reduce noise.

Tips
- 127.0.0.1 and ::1 are the same as “localhost”.
- 0.0.0.0 or * means “all network interfaces” (the app is reachable from other devices on your network, if your firewall allows it).
`;
  return <Detail markdown={md} />;
}
