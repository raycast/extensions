import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  Toast,
  closeMainWindow,
  showToast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readdirSync,
  readSync,
  realpathSync,
  statSync,
  type Dirent,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { useCallback, useEffect, useState } from "react";

const execFileAsync = promisify(execFile);

const codexBundleId = "com.openai.codex";
const codexAppPaths = [
  "/Applications/Codex.app",
  path.join(os.homedir(), "Applications", "Codex.app"),
];
const maxSessionMetaBytes = 2 * 1024 * 1024;
const maxSessionTailBytes = 1024 * 1024;
const maxDisplayedSessions = 200;
const codexProjectInitializationDelayMs = 750;

type SessionIndexEntry = {
  id?: string;
  thread_name?: string;
  updated_at?: string;
};

type SessionMetaPayload = {
  id?: string;
  timestamp?: string;
  cwd?: string;
};

type SessionMetaLine = {
  type?: string;
  payload?: SessionMetaPayload;
};

type SessionLine = {
  timestamp?: string;
};

type CodexSession = {
  id: string;
  title: string;
  cwd: string;
  filePath: string;
  updatedAtMs: number;
  updatedAtLabel: string;
  cliCommand: string;
};

function codexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

function safeRealpath(item: string) {
  try {
    return realpathSync(item);
  } catch {
    return path.resolve(item);
  }
}

function shellQuote(input: string) {
  return `'${input.replace(/'/g, `'\\''`)}'`;
}

function readJsonLines<T>(filePath: string) {
  try {
    if (!existsSync(filePath)) return [];

    return readFileSync(filePath, "utf8")
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as T];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

function readFirstLine(filePath: string) {
  let fd: number | undefined;
  try {
    fd = openSync(filePath, "r");
    const chunks: Buffer[] = [];
    let bytesReadTotal = 0;

    while (bytesReadTotal < maxSessionMetaBytes) {
      const buffer = Buffer.alloc(8192);
      const bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;

      const next = buffer.subarray(0, bytesRead);
      const newlineIndex = next.indexOf(10);
      if (newlineIndex >= 0) {
        chunks.push(next.subarray(0, newlineIndex));
        break;
      }

      chunks.push(next);
      bytesReadTotal += bytesRead;
    }

    return Buffer.concat(chunks).toString("utf8");
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function readSessionMeta(filePath: string) {
  const firstLine = readFirstLine(filePath);
  if (!firstLine) return undefined;

  try {
    const parsed = JSON.parse(firstLine) as SessionMetaLine;
    return parsed.type === "session_meta" ? parsed.payload : undefined;
  } catch {
    return undefined;
  }
}

function parseTimestampMs(timestamp?: string) {
  if (!timestamp) return undefined;

  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function newestTimestampMs(...timestamps: Array<string | undefined>) {
  return Math.max(
    ...timestamps.flatMap((timestamp) => parseTimestampMs(timestamp) ?? []),
  );
}

function readLastSessionTimestamp(filePath: string) {
  let fd: number | undefined;
  try {
    const stat = statSync(filePath);
    const byteLength = Math.min(stat.size, maxSessionTailBytes);
    const buffer = Buffer.alloc(byteLength);
    fd = openSync(filePath, "r");
    readSync(fd, buffer, 0, byteLength, Math.max(0, stat.size - byteLength));

    const lines = buffer.toString("utf8").trim().split("\n").filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      try {
        const parsed = JSON.parse(lines[index]) as SessionLine;
        if (parsed.timestamp) return parsed.timestamp;
      } catch {
        // Keep scanning in case the tail starts mid-line.
      }
    }
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }

  return undefined;
}

function sessionFilesById(...dirPaths: string[]) {
  const filesById = new Map<string, string>();

  function visit(currentPath: string) {
    let entries: Dirent[];
    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;

      const match = entry.name.match(
        /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
      );
      if (match && !filesById.has(match[1])) {
        filesById.set(match[1], entryPath);
      }
    }
  }

  dirPaths.forEach((dirPath) => visit(dirPath));
  return filesById;
}

function formatUpdatedAt(updatedAtMs: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(updatedAtMs));
}

function formatTimeAgo(updatedAtMs: number) {
  const secondsAgo = Math.max(0, Math.round((Date.now() - updatedAtMs) / 1000));
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [year, "year"],
    [month, "month"],
    [week, "week"],
    [day, "day"],
    [hour, "hour"],
    [minute, "minute"],
  ];
  const [unitSeconds, unit] = units.find(
    ([threshold]) => secondsAgo >= threshold,
  ) ?? [minute, "minute"];
  const value = -Math.floor(secondsAgo / unitSeconds);

  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    value,
    unit,
  );
}

function findCodexSessions() {
  const home = codexHome();
  const indexPath = path.join(home, "session_index.jsonl");
  const indexedSessionsById = new Map(
    readJsonLines<SessionIndexEntry>(indexPath)
      .filter((entry): entry is SessionIndexEntry & { id: string } =>
        Boolean(entry.id),
      )
      .map((entry) => [entry.id, entry]),
  );
  const filesById = sessionFilesById(path.join(home, "sessions"));
  const sessions: CodexSession[] = [];

  for (const [id, filePath] of filesById.entries()) {
    const meta = readSessionMeta(filePath);
    if (meta?.id !== id || !meta.cwd) continue;

    const indexEntry = indexedSessionsById.get(id);
    const updatedAtMs = newestTimestampMs(
      readLastSessionTimestamp(filePath),
      indexEntry?.updated_at,
      meta.timestamp,
    );
    if (!Number.isFinite(updatedAtMs)) continue;

    const cwd = safeRealpath(meta.cwd);
    sessions.push({
      id,
      title: indexEntry?.thread_name || `Codex session ${id.slice(0, 8)}`,
      cwd,
      filePath,
      updatedAtMs,
      updatedAtLabel: `${formatTimeAgo(updatedAtMs)} - ${formatUpdatedAt(updatedAtMs)}`,
      cliCommand: `codex resume -C ${shellQuote(cwd)} ${shellQuote(id)}`,
    });
  }

  return sessions
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
    .slice(0, maxDisplayedSessions);
}

async function openCodexTarget(target: string) {
  const appPath = codexAppPaths.find((item) => existsSync(item));
  if (appPath) {
    await execFileAsync("open", ["-a", appPath, target]);
    return;
  }

  await execFileAsync("open", ["-b", codexBundleId, target]);
}

async function openCodexProjectFolder(worktree: string) {
  try {
    await execFileAsync("codex", ["app", worktree]);
    return;
  } catch {
    const appPath = codexAppPaths.find((item) => existsSync(item));
    if (appPath) {
      await execFileAsync("open", ["-a", appPath, worktree]);
      return;
    }
  }

  await execFileAsync("open", ["-b", codexBundleId, worktree]);
}

async function openTerminalCommand(command: string) {
  await execFileAsync("osascript", [
    "-e",
    `tell application "Terminal" to do script ${JSON.stringify(command)}`,
    "-e",
    'tell application "Terminal" to activate',
  ]);
}

async function openCodexSession(session: CodexSession) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening Codex session",
    message: session.title,
  });

  try {
    await closeMainWindow().catch(() => undefined);
    await openCodexProjectFolder(session.cwd);
    await new Promise((resolve) =>
      setTimeout(resolve, codexProjectInitializationDelayMs),
    );
    await openCodexTarget(`codex://threads/${session.id}`);
    toast.style = Toast.Style.Success;
    toast.title = "Opened Codex session";
    toast.message = session.title;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not open Codex session";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function copySessionContents(session: CodexSession) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Copying Codex session",
    message: session.title,
  });

  try {
    await Clipboard.copy(readFileSync(session.filePath, "utf8"));
    toast.style = Toast.Style.Success;
    toast.title = "Copied Codex session JSONL";
    toast.message = session.title;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not copy Codex session";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export default function Command() {
  const [items, setItems] = useState<CodexSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setItems(findCodexSessions());
      setError(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setItems([]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load Codex sessions",
        message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <List
        isLoading={loading}
        searchBarPlaceholder="Codex sessions unavailable"
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Codex sessions not available"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search Codex sessions...">
      {!loading && items.length === 0 ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Codex sessions found"
          description={`No session JSONL files were found in ${path.join(codexHome(), "sessions")}.`}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {items.map((item) => (
        <List.Item
          id={item.id}
          key={item.id}
          title={item.title}
          subtitle={item.cwd}
          accessories={[{ text: item.updatedAtLabel }]}
          keywords={[item.id, item.cwd, path.basename(item.cwd), item.filePath]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Codex Desktop"
                icon={Icon.AppWindow}
                onAction={() => void openCodexSession(item)}
              />
              <Action
                title="Resume in Terminal"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => void openTerminalCommand(item.cliCommand)}
              />
              <Action.CopyToClipboard
                title="Copy CLI Resume Command"
                content={item.cliCommand}
              />
              <Action
                title="Copy Session Contents"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => void copySessionContents(item)}
              />
              <Action.CopyToClipboard
                title="Copy Codex Thread URL"
                content={`codex://threads/${item.id}`}
              />
              <Action.CopyToClipboard
                title="Copy Session ID"
                content={item.id}
              />
              <Action.CopyToClipboard
                title="Copy Session File"
                content={item.filePath}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
