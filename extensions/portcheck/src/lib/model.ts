// What the commands show, as plain data. Pure; unit-tested.
import type { CheckData, KillData, ListData, Socket } from "./portcheck";

export interface PortRow {
  id: string;
  port: number;
  proto: string;
  address: string;
  /** e.g. "node", "docker:web", "(hidden)" */
  name: string;
  pid?: number;
  /** When the process started; tells it apart from a later one with the same PID. */
  startTime?: string;
  user?: string;
  cmdline?: string;
  /** "npm (4200) ← zsh (900)", or "" */
  startedBy: string;
  stopHint?: string;
  url: string;
}

export function holderName(s: Socket): string {
  if (s.container) {
    return `${s.container.runtime}:${s.container.name ?? s.container.image ?? s.container.id ?? "?"}`;
  }
  return s.pid === undefined ? "(hidden)" : (s.process?.name ?? "?");
}

export function startedBy(s: Socket): string {
  return (s.process?.ancestors ?? []).map((a) => `${a.name} (${a.pid})`).join(" ← ");
}

/** One row per port, protocol and process, sorted by port. */
export function rows(data: ListData): PortRow[] {
  const seen = new Set<string>();
  const out: PortRow[] = [];
  for (const s of data.sockets) {
    const id = `${s.proto}/${s.localPort}/${s.pid ?? holderName(s)}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({
      id,
      port: s.localPort,
      proto: s.proto,
      address: s.localAddress,
      name: holderName(s),
      pid: s.container ? undefined : s.pid,
      startTime: s.process?.startTime,
      user: s.process?.user,
      cmdline: s.process?.cmdline,
      startedBy: startedBy(s),
      stopHint: s.container?.stopHint,
      url: `http://localhost:${s.localPort}/`,
    });
  }
  return out.sort((a, b) => a.port - b.port || a.proto.localeCompare(b.proto));
}

/** A Markdown report of a port check. */
export function checkMarkdown(port: number, data: CheckData): string {
  const p = data.ports.find((x) => x.port === port);
  if (!p || p.status === "free") {
    return `# Port ${port} is free\n\nNothing is listening on it.`;
  }
  if (p.status === "denied") {
    return `# Port ${port} can't be used\n\nYour user isn't allowed to bind it.`;
  }
  const lines = [`# Port ${port} is in use`, ""];
  for (const s of p.holders) {
    lines.push(`## ${holderName(s)}${s.pid !== undefined && !s.container ? ` (pid ${s.pid})` : ""}`, "");
    const by = startedBy(s);
    if (by) lines.push(`- **Started by:** ${by}`);
    if (s.process?.user) lines.push(`- **User:** ${s.process.user}`);
    if (s.process?.cmdline) lines.push(`- **Command:** \`${s.process.cmdline}\``);
    if (s.container) lines.push(`- **Stop it with:** \`${s.container.stopHint}\``);
    if (s.pid === undefined && !s.container)
      lines.push("- Owned by another user: run `sudo portcheck kill " + port + "` to stop it.");
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/** A process the user chose to stop. */
export interface Target {
  pid: number;
  name: string;
  startTime?: string;
}

/** Processes that can be stopped from a check (not containers or hidden owners). */
export function stoppable(port: number, data: CheckData): Target[] {
  const p = data.ports.find((x) => x.port === port);
  const out: Target[] = [];
  for (const s of p?.holders ?? []) {
    if (s.pid !== undefined && !s.container && !out.some((o) => o.pid === s.pid)) {
      out.push({ pid: s.pid, name: s.process?.name ?? "process", startTime: s.process?.startTime });
    }
  }
  return out;
}

/**
 * Whether the target still holds a port in a fresh listing. A PID alone isn't
 * enough: the process may have exited and the PID been reused, so the start
 * time (or, without one, the name) must match too.
 */
export function stillRunning(t: Target, data: ListData): boolean {
  return data.sockets.some(
    (s) =>
      s.pid === t.pid &&
      !s.container &&
      (t.startTime !== undefined ? s.process?.startTime === t.startTime : (s.process?.name ?? "process") === t.name),
  );
}

/** "node (pid 42): terminated", one per process. */
export function killSummary(data: KillData): { ok: boolean; text: string } {
  const failed = data.results.filter((r) => r.outcome === "failed");
  const text = data.results
    .map(
      (r) =>
        `${r.name ?? "process"} (pid ${r.pid}): ${r.outcome === "failed" ? `not stopped: ${r.error ?? "unknown error"}` : r.outcome}`,
    )
    .join("; ");
  return { ok: data.results.length > 0 && failed.length === 0, text: text || "nothing to stop" };
}

/** Parses a port argument. */
export function parsePort(s: string): number | undefined {
  const n = Number(s.trim().replace(/^:/, ""));
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : undefined;
}
