import { List, ActionPanel, Action, Icon, Color, closeMainWindow } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readdir, readFile } from "node:fs/promises";
import { execFile, execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";

// --- Types ---

type SessionStatus = "waiting" | "active" | "idle";

interface SessionInfo {
  sessionId: string;
  cwd: string;
  status: SessionStatus;
  terminalApp?: string;
  terminalPid?: number;
  terminalTty?: string;
  updatedAt: string; // ISO 8601
}

interface ParsedSession extends SessionInfo {
  projectName: string;
  updatedDate: Date;
}

// --- Constants ---

const SESSIONS_DIR = join(homedir(), ".claude", "jattends", "sessions");
const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVE_TIMEOUT_MS = 30 * 1000; // If "active" but not updated in 30s, treat as idle

const STATUS_ORDER: Record<SessionStatus, number> = {
  waiting: 0,
  active: 1,
  idle: 2,
};

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: Color; icon: Icon }> = {
  waiting: { label: "Waiting", color: Color.Orange, icon: Icon.CircleFilled },
  active: { label: "Working", color: Color.Green, icon: Icon.CircleFilled },
  idle: { label: "Ready", color: Color.SecondaryText, icon: Icon.CircleFilled },
};

const APP_NAME_MAP: Record<string, string> = {
  ghostty: "Ghostty",
  Apple_Terminal: "Terminal",
  "iTerm.app": "iTerm2",
  iTerm2: "iTerm2",
  kitty: "kitty",
  WarpTerminal: "Warp",
  Alacritty: "Alacritty",
  WezTerm: "WezTerm",
  Hyper: "Hyper",
  vscode: "Code",
  tmux: "Ghostty",
};

// --- Helpers ---

function isProcessAlive(pid: number): boolean {
  try {
    execFileSync("kill", ["-0", String(pid)], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// --- Session loading ---

async function loadSessions(): Promise<ParsedSession[]> {
  let files: string[];
  try {
    files = await readdir(SESSIONS_DIR);
  } catch {
    return [];
  }

  const now = Date.now();
  const sessions: ParsedSession[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const data = await readFile(join(SESSIONS_DIR, file), "utf-8");
      const raw: SessionInfo = JSON.parse(data);
      const updatedDate = new Date(raw.updatedAt);
      const filePath = join(SESSIONS_DIR, file);
      if (now - updatedDate.getTime() > STALE_MS) {
        try {
          unlinkSync(filePath);
        } catch {
          /* ignore */
        }
        continue;
      }

      // Skip and clean up sessions whose terminal process is dead
      if (raw.terminalPid && !isProcessAlive(raw.terminalPid)) {
        try {
          unlinkSync(filePath);
        } catch {
          /* ignore */
        }
        continue;
      }

      // If "active" but not updated recently, Claude likely finished — show as idle
      const effectiveStatus: SessionStatus =
        raw.status === "active" && now - updatedDate.getTime() > ACTIVE_TIMEOUT_MS ? "idle" : raw.status;

      sessions.push({
        ...raw,
        status: effectiveStatus,
        projectName: basename(raw.cwd),
        updatedDate,
      });
    } catch {
      continue;
    }
  }

  // Deduplicate:
  // 1. Same TTY → keep only the most recently updated (multiple sessions can't share a TTY)
  // 2. Subdirectory of another session with same PID → discard the child
  const byTty = new Map<string, ParsedSession>();
  const noTty: ParsedSession[] = [];
  for (const s of sessions) {
    const tty = s.terminalTty && s.terminalTty !== "not a tty" ? s.terminalTty : null;
    if (tty) {
      const existing = byTty.get(tty);
      if (!existing || s.updatedDate > existing.updatedDate) {
        byTty.set(tty, s);
      }
    } else {
      noTty.push(s);
    }
  }
  const merged = [...byTty.values(), ...noTty];
  const deduped = merged.filter((s, _, all) => {
    if (!s.terminalPid) return true;
    return !all.some(
      (other) =>
        other.sessionId !== s.sessionId && other.terminalPid === s.terminalPid && s.cwd.startsWith(other.cwd + "/"),
    );
  });

  deduped.sort((a, b) => {
    if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return b.updatedDate.getTime() - a.updatedDate.getTime();
  });

  return deduped;
}

// --- Terminal activation ---

function resolveAppName(terminalApp?: string): string {
  if (!terminalApp) return "Terminal";
  return APP_NAME_MAP[terminalApp] ?? terminalApp;
}

function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

/** Find the TTY for a session by looking up its claude process via ps + lsof */
function findTtyForSession(cwd: string): string | null {
  try {
    const psOutput = execFileSync("ps", ["-eo", "pid,tty,comm"], { encoding: "utf-8" });
    for (const line of psOutput.split("\n")) {
      const match = line.trim().match(/^(\d+)\s+(ttys\d+)\s+claude$/);
      if (!match) continue;
      const [, pid, ttyName] = match;
      try {
        // -a ANDs the filters; -d cwd limits to just the working directory
        const lsofOut = execFileSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], {
          encoding: "utf-8",
          timeout: 2000,
        });
        // lsof -Fn outputs lines like "n/Users/foo/project"
        const cwdLine = lsofOut.split("\n").find((l) => l.startsWith("n/"));
        if (cwdLine && cwdLine.slice(1) === cwd) {
          return `/dev/${ttyName}`;
        }
      } catch {
        continue;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function activateSession(session: ParsedSession): Promise<void> {
  const appName = resolveAppName(session.terminalApp);
  const projectName = session.projectName.replace(/"/g, '\\"');
  const cwdPath = session.cwd.replace(/"/g, '\\"');

  // Resolve TTY: use session file value, or look it up from the claude process
  const tty =
    session.terminalTty && session.terminalTty !== "not a tty" ? session.terminalTty : findTtyForSession(session.cwd);

  // Strategy 1: If we have the TTY, write a unique OSC title marker to it,
  // then find the window with that title via System Events. Works with any
  // terminal that supports OSC 2 (window title) — Ghostty, iTerm2, kitty, etc.
  if (tty) {
    const marker = `__jattends_${session.sessionId.slice(0, 8)}__`;
    try {
      // Set a unique window title via OSC 2
      execFileSync("bash", ["-c", `printf '\\e]2;${marker}\\a' > ${tty}`], { timeout: 2000 });
      // Brief pause for the terminal to process the escape sequence
      await new Promise((r) => setTimeout(r, 100));

      const script = `
tell application "${appName}" to activate
tell application "System Events"
  tell process "${appName}"
    set frontmost to true
    set windowList to every window
    repeat with w in windowList
      if name of w contains "${marker}" then
        perform action "AXRaise" of w
        return "found"
      end if
    end repeat
  end tell
end tell
return "not_found"`;
      const result = await runAppleScript(script);
      // Reset the title (empty OSC 2 tells the terminal to use its default)
      execFileSync("bash", ["-c", `printf '\\e]2;\\a' > ${tty}`], { timeout: 2000 });
      if (result === "found") {
        await closeMainWindow();
        return;
      }
    } catch {
      // TTY approach failed, fall through to other strategies
    }
  }

  // Strategy 2: AppleScript title/image matching (for terminals with titles)
  const script = `
tell application "${appName}" to activate
tell application "System Events"
  tell process "${appName}"
    set frontmost to true
    set windowList to every window
    repeat with w in windowList
      if name of w contains "${projectName}" then
        perform action "AXRaise" of w
        return "found"
      end if
    end repeat
    repeat with w in windowList
      if name of w contains "${cwdPath}" then
        perform action "AXRaise" of w
        return "found"
      end if
    end repeat
  end tell
end tell
return "not_found"`;

  await runAppleScript(script);
  await closeMainWindow();
}

// --- Command ---

export default function SwitchSession() {
  const { data: sessions, isLoading } = usePromise(loadSessions);

  const grouped: Record<SessionStatus, ParsedSession[]> = {
    waiting: [],
    active: [],
    idle: [],
  };

  for (const s of sessions ?? []) {
    grouped[s.status].push(s);
  }

  const sections: { status: SessionStatus; items: ParsedSession[] }[] = (
    ["waiting", "active", "idle"] as SessionStatus[]
  )
    .filter((status) => grouped[status].length > 0)
    .map((status) => ({ status, items: grouped[status] }));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      {sections.map(({ status, items }) => (
        <List.Section key={status} title={STATUS_CONFIG[status].label}>
          {items.map((session) => {
            const config = STATUS_CONFIG[session.status];
            return (
              <List.Item
                key={session.sessionId}
                title={session.projectName}
                subtitle={session.cwd}
                keywords={[session.sessionId, session.cwd, session.projectName]}
                icon={{ source: config.icon, tintColor: config.color }}
                accessories={[{ tag: { value: config.label, color: config.color } }]}
                actions={
                  <ActionPanel>
                    <Action title="Switch to Session" onAction={() => activateSession(session)} />
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
