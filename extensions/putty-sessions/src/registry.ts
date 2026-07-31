import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Escapes a value for use inside a PowerShell single-quoted string. */
export function psQuote(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

/**
 * Runs a PowerShell snippet that assigns `$result`, and returns the objects it produced.
 *
 * The registry is read through PowerShell's registry provider rather than `reg.exe`, because
 * `reg.exe` is commonly blocked by policy on domain-joined machines — and a blocked `reg.exe` is
 * indistinguishable from "you have no saved sessions" unless the failure is reported.
 *
 * Two constraints shape this:
 *
 * - The snippet must stick to cmdlets and property reads. AppLocker puts PowerShell into
 *   ConstrainedLanguage mode, where .NET calls (`$key.GetValue(...)`, `[Console]::OutputEncoding`)
 *   throw.
 * - The JSON is written to a file rather than to stdout. `ConvertTo-Json` does not escape non-ASCII,
 *   so anything sent to stdout is re-encoded with the console code page and a session named `Müller`
 *   comes back corrupted. `Out-File -Encoding utf8` is deterministic and is a cmdlet, so it is
 *   allowed in ConstrainedLanguage.
 *
 * Throws if PowerShell cannot be run, or wrote something that is not JSON.
 */
export async function queryRegistry<T>(script: string): Promise<T[]> {
  const output = path.join(os.tmpdir(), `raycast-putty-${randomUUID()}.json`);

  const program = `
$ErrorActionPreference = 'Stop'
$result = @()
${script}
ConvertTo-Json -InputObject @($result) -Compress | Out-File -LiteralPath ${psQuote(output)} -Encoding utf8
`;

  try {
    await execFileAsync("powershell", ["-NoProfile", "-NonInteractive", "-Command", program], { windowsHide: true });

    // Windows PowerShell writes UTF-8 with a BOM; PowerShell 7 writes it without one.
    const json = (await readFile(output, "utf8")).replace(/^\uFEFF/, "").trim();
    if (json.length === 0) return [];

    const parsed: unknown = JSON.parse(json);
    // Windows PowerShell's ConvertTo-Json unwraps a single-element array into a bare object.
    return (Array.isArray(parsed) ? parsed : [parsed]) as T[];
  } finally {
    await rm(output, { force: true });
  }
}

/**
 * Reads a single value from a registry key, or `undefined` if the key or the value is absent.
 *
 * Used for locating the executable, where a miss is expected and the caller has other places to
 * look, so any failure is reported as "not found" rather than raised.
 */
export async function readRegistryValue(key: string, name: string): Promise<string | undefined> {
  const script = `
$key = ${psQuote(key)}
if (Test-Path -LiteralPath $key) {
  $value = (Get-ItemProperty -LiteralPath $key).${psQuote(name)}
  if ($null -ne $value) { $result = @([pscustomobject]@{ value = [string]$value }) }
}
`;

  try {
    const [row] = await queryRegistry<{ value?: string }>(script);
    return row?.value?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Lists the value *names* of a registry key. The MSI records each folder it created as a value name
 * under `Installer\Folders`, with empty data, which is the only place PuTTY's install directory is
 * recorded. Returns an empty list if the key is missing or unreadable.
 */
export async function readRegistryValueNames(key: string): Promise<string[]> {
  const script = `
$key = ${psQuote(key)}
if (Test-Path -LiteralPath $key) {
  $result = @((Get-Item -LiteralPath $key).Property | ForEach-Object { [pscustomobject]@{ name = $_ } })
}
`;

  try {
    const rows = await queryRegistry<{ name?: string }>(script);
    return rows.map((row) => row.name).filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}
