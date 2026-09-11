import type { RawWinSCPSession, WinSCPProtocol, WinSCPSession } from "../types";

/** WinSCP's `TFSProtocol` enum. Values it never writes (3, 4) simply fall back to the default. */
const FS_PROTOCOLS: Record<number, WinSCPProtocol> = {
  0: "scp",
  1: "sftp",
  2: "sftp",
  5: "ftp",
  6: "webdav",
  7: "s3",
};

const DEFAULT_PROTOCOL: WinSCPProtocol = "sftp";

/** WinSCP omits `FSProtocol` for SFTP sessions, and writes it as a decimal in INI files but as `0x2` in the registry. */
export function toProtocol(fsProtocol: string | undefined): WinSCPProtocol {
  if (!fsProtocol) {
    return DEFAULT_PROTOCOL;
  }
  const value = fsProtocol.trim().toLowerCase();
  const numeric = value.startsWith("0x") ? Number.parseInt(value, 16) : Number(value);
  if (!Number.isInteger(numeric)) {
    return DEFAULT_PROTOCOL;
  }
  return FS_PROTOCOLS[numeric] ?? DEFAULT_PROTOCOL;
}

const SECTION = /^\[(.*)\]$/;
const SESSION_SECTION = /^\[Sessions\\(.+)\]$/;

export function parseIniSessions(content: string): RawWinSCPSession[] {
  const sessions: RawWinSCPSession[] = [];
  let current: RawWinSCPSession | null = null;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (SECTION.test(trimmed)) {
      const match = trimmed.match(SESSION_SECTION);
      current = match ? { id: match[1] } : null;
      if (current) {
        sessions.push(current);
      }
      continue;
    }

    if (current) {
      assignValue(current, trimmed);
    }
  }

  return sessions;
}

/**
 * Parses the JSON our PowerShell snippet prints for the registry sessions.
 *
 * Values are typed as the registry has them: `FSProtocol` arrives as a number, and a value WinSCP
 * never wrote arrives as `null`. A single session may arrive unwrapped rather than as an array,
 * which is a long-standing `ConvertTo-Json` quirk in Windows PowerShell.
 */
export function parseRegistrySessions(json: string): RawWinSCPSession[] {
  const trimmed = json.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const parsed: unknown = JSON.parse(trimmed);
  const entries = Array.isArray(parsed) ? parsed : [parsed];

  const sessions: RawWinSCPSession[] = [];
  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const { id, hostName, userName, fsProtocol, isWorkspace } = entry as Record<string, unknown>;
    if (typeof id !== "string") {
      continue;
    }
    sessions.push({
      id,
      hostName: text(hostName),
      userName: text(userName),
      fsProtocol: text(fsProtocol),
      isWorkspace: isWorkspace === null || isWorkspace === undefined ? undefined : toBool(text(isWorkspace)),
    });
  }
  return sessions;
}

function text(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

/** WinSCP writes booleans as `1`/`0`, as a string in the INI and as a DWORD in the registry. */
function toBool(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "0" && value.trim().length > 0;
}

function assignValue(session: RawWinSCPSession, line: string): void {
  const separator = line.indexOf("=");
  if (separator === -1) {
    return;
  }
  const key = line.slice(0, separator);
  const value = line.slice(separator + 1);

  if (key === "HostName") {
    session.hostName = value;
  } else if (key === "UserName") {
    session.userName = value;
  } else if (key === "FSProtocol") {
    session.fsProtocol = value;
  } else if (key === "IsWorkspace") {
    session.isWorkspace = toBool(value);
  }
}

/** WinSCP's template for new sites, not a real session. */
const DEFAULT_SETTINGS_ID = "Default%20Settings";

/**
 * A workspace is stored as one session per tab, `<workspace>/0000`, `<workspace>/0001`, ... , each
 * flagged with `IsWorkspace`. A session inside a folder is stored the same way, `<folder>/<session>`,
 * so the flag is the only thing that tells the two apart: a workspace member named `0000` and a
 * foldered session named `0000` are indistinguishable by name. See `TStoredSessionList::IsFolder`
 * and `SaveWorkspaceData` in WinSCP's `SessionData.cpp`.
 */
function workspaceIdOf(session: RawWinSCPSession): string | undefined {
  if (!session.isWorkspace) {
    return undefined;
  }
  const separator = session.id.lastIndexOf("/");
  return separator === -1 ? undefined : session.id.slice(0, separator);
}

/**
 * A percent-encoded UTF-8 BOM, which WinSCP puts in front of a key whose name contains non-ASCII
 * characters, to record that the rest of the key is UTF-8. It flags the encoding of the stored key
 * and is not part of the session name, so WinSCP.exe does not accept it back on the command line:
 * passing it through makes WinSCP look for a *host* named `<BOM>My Süd` and fail.
 */
const ENCODED_BOM = /^%EF%BB%BF/i;

/**
 * Turns stored sessions into displayable ones: decodes names, drops entries that cannot be launched,
 * and collapses each workspace's members into a single entry.
 */
export function toSessions(rawSessions: RawWinSCPSession[]): WinSCPSession[] {
  const sessions: WinSCPSession[] = [];
  const workspaces = new Map<string, WinSCPSession>();

  for (const stored of rawSessions) {
    const raw: RawWinSCPSession = { ...stored, id: stored.id.replace(ENCODED_BOM, "") };

    if (raw.id.length === 0 || raw.id === DEFAULT_SETTINGS_ID) {
      continue;
    }

    const workspaceId = workspaceIdOf(raw);
    if (workspaceId) {
      const workspace = workspaces.get(workspaceId);
      if (workspace) {
        workspace.sessionCount = (workspace.sessionCount ?? 0) + 1;
        continue;
      }
      const created: WinSCPSession = {
        id: workspaceId,
        name: decodeName(workspaceId),
        protocol: toProtocol(raw.fsProtocol),
        isWorkspace: true,
        sessionCount: 1,
      };
      workspaces.set(workspaceId, created);
      sessions.push(created);
      continue;
    }

    const host = nonEmpty(raw.hostName);
    if (!host) {
      continue;
    }

    sessions.push({
      id: raw.id,
      name: decodeName(raw.id),
      protocol: toProtocol(raw.fsProtocol),
      host,
      user: nonEmpty(raw.userName),
      isWorkspace: false,
    });
  }

  return sessions;
}

/** WinSCP percent-encodes characters that are not valid in a key name, e.g. `My%20Site`. */
function decodeName(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

export function formatSessionTarget(session: WinSCPSession): string {
  if (session.isWorkspace) {
    const count = session.sessionCount ?? 0;
    return `Workspace · ${count} ${count === 1 ? "session" : "sessions"}`;
  }
  const authority = session.user ? `${session.user}@${session.host}` : session.host;
  return `${session.protocol}://${authority}`;
}
