export type Status =
  "running" | "stopped" | "waiting" | "stopping" | "restarting" | "failed" | "errored" | "completed" | "available";

export type Daemon = {
  id: string;
  namespace?: string;
  name?: string;
  pid: number | null;
  status: Status | string;
  oneshot?: boolean;
  disabled?: boolean;
  proxy_url?: string | null;
  url?: string | null;
  error?: string | null;
  active_port?: number;
  port?: number[];
  uptime?: string;
};

export type Action = "start" | "stop" | "restart";

export function decode(stdout: string): Daemon[] {
  const rows = JSON.parse(stdout);
  if (!Array.isArray(rows) || rows.some((r) => typeof r?.id !== "string" || typeof r?.status !== "string")) {
    throw new Error("Unsupported Pitchfork JSON response");
  }
  return rows;
}

export function isSupervisorDown(message: string): boolean {
  return /connection_failed|failed to connect to supervisor/i.test(message);
}

export function namespaceOf(daemon: Daemon): string {
  if (daemon.namespace) return daemon.namespace;
  const index = daemon.id.lastIndexOf("/");
  return index < 0 ? "global" : daemon.id.slice(0, index);
}

export function nameOf(daemon: Daemon): string {
  return daemon.name || daemon.id.slice(daemon.id.lastIndexOf("/") + 1);
}

export function daemonUrl(daemon: Daemon): string | null {
  // Opening a stopped daemon's proxy URL makes Pitchfork start it.
  if (daemon.status !== "running") return null;
  const port = Number.isInteger(daemon.active_port) ? `http://localhost:${daemon.active_port}` : null;
  return (
    [daemon.proxy_url, daemon.url, port].find((url) => typeof url === "string" && /^https?:\/\/\S+$/i.test(url)) ?? null
  );
}

export function daemonActions(daemon: Daemon): Action[] {
  const { status, disabled } = daemon;
  if (status === "running") return disabled ? ["stop"] : ["stop", "restart"];
  // Stop is how Pitchfork interrupts a retry or a pending start.
  if (status === "waiting" || status === "restarting") return ["stop"];
  if (status === "errored") return disabled ? ["stop"] : ["start", "stop"];
  if (disabled) return [];
  return ["available", "stopped", "failed", "completed"].includes(status) ? ["start"] : [];
}

const transitioning = (daemon: Daemon) => ["stopping", "waiting", "restarting"].includes(daemon.status);

export function groupActions(daemons: Daemon[]): Action[] {
  if (!daemons.length || daemons.some(transitioning)) return [];
  return (["start", "restart", "stop"] as Action[]).filter((action) => groupTargets(daemons, action).length);
}

export function groupTargets(daemons: Daemon[], action: Action): string[] {
  return daemons.filter((daemon) => daemonActions(daemon).includes(action)).map((daemon) => daemon.id);
}

export function formatElapsed(etime: string): string {
  const [days, clock] = etime.includes("-") ? etime.split("-") : ["0", etime];
  const [s, m = 0, h = 0] = clock.split(":").reverse().map(Number);
  const d = Number(days);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : m ? `${m}m` : `${s}s`;
}
