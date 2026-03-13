import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { WinSCPError, WinSCPErrorCode } from "../errors";
import type { WinSCPSession } from "../types";

const execAsync = promisify(exec);

function getWinSCPExtendedIniPath(): string | null {
  const { programPath } = getPreferenceValues<{ programPath: string }>();
  const winSCPDir = programPath || join(homedir(), "AppData", "Local", "Programs", "WinSCP");

  if (existsSync(winSCPDir)) {
    return winSCPDir;
  }
  return null;
}

async function loadWinSCPSessions(): Promise<WinSCPSession[]> {
  const winSCPDir = getWinSCPExtendedIniPath();
  if (!winSCPDir) {
    throw new WinSCPError(WinSCPErrorCode.WINSCP_NOT_FOUND);
  }
  const iniPath = join(winSCPDir, "WinSCP.ini");

  try {
    await access(iniPath);
    const iniData = await readFile(iniPath, "utf-8");
    const sessions: WinSCPSession[] = [];
    const lines = iniData.split(/\r?\n/);
    let currentSession: Partial<WinSCPSession> | null = null;

    for (const line of lines) {
      // Match workspace sessions: [Sessions\SessionName/0000]
      const workspaceMatch = line.match(/^\[Sessions\\(.+?)\/\d+\]$/);
      // Match regular sessions: [Sessions\user@host] or [Sessions\SessionName]
      const regularMatch = line.match(/^\[Sessions\\([^\]]+)\]$/);

      const sessionMatch = workspaceMatch || regularMatch;

      if (sessionMatch) {
        if (currentSession?.name) {
          sessions.push(currentSession as WinSCPSession);
        }
        currentSession = { name: decodeURIComponent(sessionMatch[1]) };
      } else if (currentSession) {
        const hostMatch = line.match(/^HostName=(.+)$/);
        if (hostMatch) {
          currentSession.host = hostMatch[1];
        }
        const userMatch = line.match(/^UserName=(.+)$/);
        if (userMatch) {
          currentSession.user = userMatch[1];
        }
      }
    }
    if (currentSession?.name && currentSession?.host && currentSession?.user) {
      sessions.push(currentSession as WinSCPSession);
    }
    return sessions;
  } catch (error) {
    throw new WinSCPError(
      WinSCPErrorCode.UNKNOWN_ERROR,
      error instanceof Error ? error.message : "Failed to read INI file",
    );
  }
}

export function useWinSCP() {
  const { data, isLoading } = useCachedPromise(
    async () => {
      try {
        return await loadWinSCPSessions();
      } catch (err) {
        if (err instanceof Error) {
          return { error: err, data: [] };
        }
        throw err;
      }
    },
    [],
    {
      initialData: [],
    },
  );

  const launchSession = async (session: WinSCPSession) => {
    const winSCPDir = getWinSCPExtendedIniPath();
    if (!winSCPDir) {
      throw new WinSCPError(WinSCPErrorCode.WINSCP_NOT_FOUND);
    }
    const winSCPExe = join(winSCPDir, "WinSCP.exe");
    try {
      const command = `start "" "${winSCPExe}" "${session.name}"`;
      await execAsync(command);

      await showToast({
        style: Toast.Style.Success,
        title: "Session Launched",
        message: `Starting ${session.name}`,
      });
    } catch (err) {
      await showFailureToast(err, {
        title: "Launch Failed",
        message: `Could not launch ${session.name}. Make sure WinSCP is in your PATH.`,
      });
    }
  };

  return {
    data: Array.isArray(data) ? data : [],
    error: data && "error" in data ? data.error : undefined,
    isLoading,
    launchSession,
  };
}
