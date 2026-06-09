import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

type ClaudeStatus = "waiting" | "busy" | "idle" | "error" | "unknown";

type SessionFile = {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  updatedAt: number;
  version?: string;
  kind?: string;
  entrypoint?: string;
  name?: string;
  status?: string;
  waitingFor?: string;
};

type TmuxPane = {
  sessionName: string;
  windowIndex: string;
  windowName: string;
  paneIndex: string;
  panePid: number;
  paneCurrentCommand: string;
  paneCurrentPath: string;
};

type ClaudeSession = SessionFile & {
  status: ClaudeStatus;
  pane?: TmuxPane;
  target?: string; // tmux target session:window.pane
  alive: boolean;
};

const STATUS_ORDER: Record<ClaudeStatus, number> = {
  waiting: 0,
  error: 1,
  busy: 2,
  idle: 3,
  unknown: 4,
};

function normalizeStatus(s: string | undefined): ClaudeStatus {
  if (!s) return "unknown";
  if (s === "waiting" || s === "busy" || s === "idle" || s === "error")
    return s;
  return "unknown";
}

function statusIcon(status: ClaudeStatus) {
  switch (status) {
    case "waiting":
      return { source: Icon.QuestionMarkCircle, tintColor: Color.Yellow };
    case "busy":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "idle":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "error":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function shortPath(p: string) {
  const home = homedir();
  if (p.startsWith(home)) return "~" + p.slice(home.length);
  return p;
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

async function readSessions(): Promise<SessionFile[]> {
  const dir = path.join(homedir(), ".claude", "sessions");
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const files = names.filter((n) => n.endsWith(".json"));
  const results = await Promise.all(
    files.map(async (n) => {
      try {
        const raw = await readFile(path.join(dir, n), "utf8");
        return JSON.parse(raw) as SessionFile;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is SessionFile => r != null);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const TMUX_BINARIES = [
  "/opt/homebrew/bin/tmux",
  "/usr/local/bin/tmux",
  "/usr/bin/tmux",
];

async function runTmux(
  args: string[],
  socket?: string,
): Promise<{ stdout: string }> {
  const fullArgs = socket ? ["-S", socket, ...args] : args;
  const env = {
    ...process.env,
    PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
  };
  let lastErr: unknown;
  for (const bin of TMUX_BINARIES) {
    try {
      const { stdout } = await execFileAsync(bin, fullArgs, {
        timeout: 3000,
        env,
      });
      return { stdout };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("tmux binary not found");
}

// Find a usable tmux socket path. Raycast doesn't inherit $TMUX.
async function findTmuxSocket(): Promise<string | undefined> {
  const candidates: string[] = [];
  if (process.env.TMUX) candidates.push(process.env.TMUX.split(",")[0]);
  const uid = process.getuid?.();
  if (uid != null) {
    candidates.push(`/private/tmp/tmux-${uid}/default`);
    candidates.push(`/tmp/tmux-${uid}/default`);
  }
  for (const s of candidates) {
    try {
      await runTmux(["list-sessions"], s);
      return s;
    } catch {
      // try next candidate
    }
  }
  return undefined;
}

async function listTmuxPanes(socket?: string): Promise<TmuxPane[]> {
  const SEP = "|::|";
  const fmt = [
    "#{session_name}",
    "#{window_index}",
    "#{window_name}",
    "#{pane_index}",
    "#{pane_pid}",
    "#{pane_current_command}",
    "#{pane_current_path}",
  ].join(SEP);
  try {
    const { stdout } = await runTmux(["list-panes", "-a", "-F", fmt], socket);
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [
          sessionName,
          windowIndex,
          windowName,
          paneIndex,
          panePid,
          paneCurrentCommand,
          paneCurrentPath,
        ] = line.split(SEP);
        return {
          sessionName,
          windowIndex,
          windowName,
          paneIndex,
          panePid: parseInt(panePid, 10),
          paneCurrentCommand,
          paneCurrentPath,
        };
      });
  } catch {
    return [];
  }
}

// Build a child->parent process map and an index of descendants for each ancestor.
async function buildPidToAncestor(): Promise<Map<number, number>> {
  // Map of pid -> ppid
  const { stdout } = await execFileAsync("/bin/ps", ["-Ao", "pid,ppid"], {
    timeout: 3000,
  });
  const map = new Map<number, number>();
  for (const line of stdout.split("\n").slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [pidStr, ppidStr] = trimmed.split(/\s+/);
    const pid = parseInt(pidStr, 10);
    const ppid = parseInt(ppidStr, 10);
    if (!isNaN(pid) && !isNaN(ppid)) map.set(pid, ppid);
  }
  return map;
}

// Given a child pid, walk up parents to see if any ancestor matches paneRoots.
function findOwningPane(
  childPid: number,
  parentMap: Map<number, number>,
  panePids: Set<number>,
): number | undefined {
  let current: number | undefined = childPid;
  let safety = 0;
  while (current && safety++ < 50) {
    if (panePids.has(current)) return current;
    current = parentMap.get(current);
    if (!current || current <= 1) break;
  }
  return undefined;
}

export default function Command() {
  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [socket, setSocket] = useState<string | undefined>();

  async function load() {
    setLoading(true);
    try {
      const sock = await findTmuxSocket();
      setSocket(sock);
      const [rawSessions, panes, parentMap] = await Promise.all([
        readSessions(),
        listTmuxPanes(sock),
        buildPidToAncestor().catch(() => new Map<number, number>()),
      ]);

      const panePidToPane = new Map<number, TmuxPane>();
      for (const p of panes) panePidToPane.set(p.panePid, p);
      const panePids = new Set(panePidToPane.keys());

      // cwd fallback index (real path → first matching pane). Used when ps process tree is unavailable.
      const cwdToPane = new Map<string, TmuxPane>();
      for (const p of panes) {
        if (!cwdToPane.has(p.paneCurrentPath))
          cwdToPane.set(p.paneCurrentPath, p);
      }

      const enriched: ClaudeSession[] = rawSessions.map((s) => {
        const alive = isAlive(s.pid);
        let pane: TmuxPane | undefined;
        if (alive) {
          const owningPanePid = findOwningPane(s.pid, parentMap, panePids);
          pane = owningPanePid
            ? panePidToPane.get(owningPanePid)
            : cwdToPane.get(s.cwd);
        }
        const target = pane
          ? `${pane.sessionName}:${pane.windowIndex}.${pane.paneIndex}`
          : undefined;
        const status: ClaudeStatus = alive
          ? normalizeStatus(s.status)
          : "error";
        return { ...s, status, pane, target, alive };
      });

      // Only show sessions that are alive and tied to a tmux pane, or alive without a pane.
      // Hide stale entries (dead pid).
      const visible = enriched.filter((s) => s.alive);

      visible.sort((a, b) => {
        const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (sd !== 0) return sd;
        return b.updatedAt - a.updatedAt;
      });

      setSessions(visible);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  async function jumpTo(session: ClaudeSession) {
    if (!session.pane || !session.target) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No tmux pane found for this session",
      });
      return;
    }
    try {
      // Select window + pane, then switch client. If no client attached, attach via terminal.
      await runTmux(["select-pane", "-t", session.target], socket);
      await runTmux(
        [
          "select-window",
          "-t",
          `${session.pane.sessionName}:${session.pane.windowIndex}`,
        ],
        socket,
      );
      // Try switching attached client; if none, this fails harmlessly.
      try {
        await runTmux(
          ["switch-client", "-t", session.pane.sessionName],
          socket,
        );
      } catch {
        // no attached client — fall through to launch terminal
      }
      // Bring Ghostty to the foreground (or Terminal/iTerm fallback).
      await execFileAsync("/usr/bin/osascript", [
        "-e",
        'tell application "Ghostty" to activate',
      ]).catch(async () => {
        await execFileAsync("/usr/bin/osascript", [
          "-e",
          'tell application "Terminal" to activate',
        ]).catch(() => {});
      });
      await closeMainWindow();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "tmux jump failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const counts = useMemo(() => {
    const c: Record<ClaudeStatus, number> = {
      waiting: 0,
      busy: 0,
      idle: 0,
      error: 0,
      unknown: 0,
    };
    for (const s of sessions) c[s.status]++;
    return c;
  }, [sessions]);

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter Claude sessions…">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load sessions"
          description={error}
        />
      ) : sessions.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No running Claude sessions"
        />
      ) : null}

      {(["waiting", "busy", "idle", "unknown", "error"] as ClaudeStatus[])
        .filter((status) => counts[status] > 0)
        .map((status) => (
          <List.Section
            key={status}
            title={statusSectionTitle(status)}
            subtitle={`${counts[status]}`}
          >
            {sessions
              .filter((s) => s.status === status)
              .map((s) => {
                const title = path.basename(s.cwd) || s.cwd;
                const subtitle = shortPath(s.cwd);
                const accessories: List.Item.Accessory[] = [];
                if (s.status === "waiting" && s.waitingFor) {
                  accessories.push({
                    tag: { value: s.waitingFor, color: Color.Yellow },
                  });
                }
                if (s.target) {
                  accessories.push({
                    tag: { value: s.target, color: Color.Blue },
                    icon: Icon.Terminal,
                  });
                } else {
                  accessories.push({
                    tag: { value: "no tmux pane", color: Color.SecondaryText },
                  });
                }
                accessories.push({ text: relativeTime(s.updatedAt) });

                return (
                  <List.Item
                    key={s.sessionId}
                    icon={statusIcon(s.status)}
                    title={title}
                    subtitle={subtitle}
                    accessories={accessories}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Jump to Tmux Pane"
                          icon={Icon.ArrowRight}
                          onAction={() => jumpTo(s)}
                        />
                        <Action
                          title="Copy Tmux Target"
                          icon={Icon.CopyClipboard}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                          onAction={async () => {
                            const { Clipboard } = await import("@raycast/api");
                            await Clipboard.copy(s.target ?? "");
                            await showToast({
                              title: "Copied",
                              message: s.target ?? "no target",
                            });
                          }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Session ID"
                          content={s.sessionId}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Working Directory"
                          content={s.cwd}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          onAction={load}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>
        ))}
    </List>
  );
}

function statusSectionTitle(status: ClaudeStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting for input";
    case "busy":
      return "Running";
    case "idle":
      return "Idle";
    case "error":
      return "Error";
    default:
      return "Unknown";
  }
}
