import { getPreferenceValues } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { WinSCPError, WinSCPErrorCode } from "../errors";
import type { RawWinSCPSession, WinSCPSession } from "../types";
import { parseIniSessions, parseRegistrySessions, toSessions } from "./parse";
import { winSCPExeCandidates, winSCPIniCandidates } from "./paths";

const execFileAsync = promisify(execFile);

const REGISTRY_SESSIONS_KEY = "HKCU:\\Software\\Martin Prikryl\\WinSCP 2\\Sessions";

/** Escapes a value for use inside a PowerShell single-quoted string. */
function psQuote(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

const READ_SESSIONS_SCRIPT = `
$key = ${psQuote(REGISTRY_SESSIONS_KEY)}
if (Test-Path -LiteralPath $key) {
  $result = @(Get-ChildItem -LiteralPath $key | ForEach-Object {
    $values = Get-ItemProperty -LiteralPath $_.PSPath
    [pscustomobject]@{
      id = $_.PSChildName
      hostName = $values.HostName
      userName = $values.UserName
      fsProtocol = $values.FSProtocol
      isWorkspace = $values.IsWorkspace
    }
  })
}
`;

export function findWinSCPExe(): string {
  const { programPath } = getPreferenceValues<{ programPath: string }>();
  const exe = winSCPExeCandidates(programPath).find(existsSync);
  if (!exe) {
    throw new WinSCPError(WinSCPErrorCode.WINSCP_NOT_FOUND);
  }
  return exe;
}

/**
 * Reads the sessions through PowerShell's registry provider rather than `reg.exe`, which is
 * commonly blocked by policy on managed machines.
 *
 * Two constraints shape this:
 *
 * - The snippet sticks to cmdlets and property reads. AppLocker puts PowerShell into
 *   ConstrainedLanguage mode, where .NET calls (`[Console]::OutputEncoding`) throw.
 * - The JSON is written to a file rather than to stdout. `ConvertTo-Json` does not escape non-ASCII,
 *   so anything sent to stdout is re-encoded with the console code page and a host or user name
 *   containing, say, an umlaut comes back corrupted. `Out-File -Encoding utf8` is deterministic, and
 *   is a cmdlet, so it is allowed in ConstrainedLanguage.
 */
async function readRegistrySessions(): Promise<RawWinSCPSession[]> {
  const output = join(tmpdir(), `raycast-winscp-${randomUUID()}.json`);

  const program = `
$ErrorActionPreference = 'Stop'
$result = @()
${READ_SESSIONS_SCRIPT}
ConvertTo-Json -InputObject @($result) -Compress | Out-File -LiteralPath ${psQuote(output)} -Encoding utf8
`;

  try {
    await execFileAsync("powershell", ["-NoProfile", "-NonInteractive", "-Command", program], { windowsHide: true });

    // Windows PowerShell writes UTF-8 with a BOM; PowerShell 7 writes it without one.
    const json = (await readFile(output, "utf8")).replace(/^\uFEFF/, "");
    return parseRegistrySessions(json);
  } catch (error) {
    // Reporting the failure beats returning an empty list, which reads as "you have no sessions".
    throw new WinSCPError(WinSCPErrorCode.REGISTRY_READ_FAILED, error instanceof Error ? error.message : String(error));
  } finally {
    await rm(output, { force: true });
  }
}

/** Sessions live in an INI file, or, when WinSCP is left on its default storage, in the registry. */
export async function loadSessions(exe: string): Promise<WinSCPSession[]> {
  const iniPath = winSCPIniCandidates(exe).find(existsSync);
  if (iniPath) {
    return toSessions(parseIniSessions(await readFile(iniPath, "utf-8")));
  }
  return toSessions(await readRegistrySessions());
}

export async function launchSession(exe: string, session: WinSCPSession, newInstance = false): Promise<void> {
  const args = newInstance ? [session.id, "/newinstance"] : [session.id];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(exe, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
