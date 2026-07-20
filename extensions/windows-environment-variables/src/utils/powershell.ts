import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { EnvScope, EnvVar } from "./types.js";

const execFileAsync = promisify(execFile);

/**
 * Execute a PowerShell command using UTF-16LE base64 encoded command.
 * This avoids all escaping issues with special characters.
 */
export async function runPowerShell(command: string): Promise<string> {
  const encoded = Buffer.from(command, "utf16le").toString("base64");
  const { stdout } = (await execFileAsync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
    {
      encoding: "utf8",
      timeout: 15000,
    },
  )) as { stdout: string };
  return (stdout ?? "").trim();
}

/**
 * Execute a PowerShell command with elevated (admin) privileges.
 * Will trigger a UAC prompt for the user.
 * Uses -EncodedCommand for the inner PowerShell to avoid escaping issues.
 */
export async function runPowerShellElevated(command: string): Promise<void> {
  const innerEncoded = Buffer.from(command, "utf16le").toString("base64");
  const wrapper = `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-NonInteractive','-EncodedCommand','${innerEncoded}'`;
  await runPowerShell(wrapper);
}

/**
 * Retrieve all environment variables for a given scope.
 * Returns them sorted alphabetically by name.
 */
export async function getAllEnvVars(scope: EnvScope): Promise<EnvVar[]> {
  const ps = `
$vars = [System.Environment]::GetEnvironmentVariables('${scope}')
$result = @()
foreach ($key in $vars.Keys) {
  $result += @{ name = [string]$key; value = [string]$vars[$key] }
}
$result | ConvertTo-Json -Compress
`.trim();

  const output = await runPowerShell(ps);
  if (!output || output === "") return [];

  const parsed = JSON.parse(output);
  const items: EnvVar[] = (Array.isArray(parsed) ? parsed : [parsed]).map(
    (item: { name: string; value: string }) => ({
      name: item.name,
      value: item.value,
      scope,
    }),
  );

  return items.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * Get a single environment variable value.
 * Returns null if the variable does not exist.
 */
export async function getEnvVar(
  name: string,
  scope: EnvScope,
): Promise<string | null> {
  const safeName = name.replace(/'/g, "''");
  const ps = `[System.Environment]::GetEnvironmentVariable('${safeName}', '${scope}')`;
  const output = await runPowerShell(ps);
  return output === "" ? null : output;
}

/**
 * Set (create or update) an environment variable.
 * Machine-scope variables require elevation (UAC prompt).
 */
export async function setEnvVar(
  name: string,
  value: string,
  scope: EnvScope,
): Promise<void> {
  const safeName = name.replace(/'/g, "''");
  const safeValue = value.replace(/'/g, "''");
  const ps = `[System.Environment]::SetEnvironmentVariable('${safeName}', '${safeValue}', '${scope}')`;

  if (scope === "Machine") {
    await runPowerShellElevated(ps);
  } else {
    await runPowerShell(ps);
  }

  await broadcastSettingChange();
}

/**
 * Delete an environment variable by setting it to null.
 * Machine-scope variables require elevation (UAC prompt).
 */
export async function deleteEnvVar(
  name: string,
  scope: EnvScope,
): Promise<void> {
  const safeName = name.replace(/'/g, "''");
  const ps = `[System.Environment]::SetEnvironmentVariable('${safeName}', $null, '${scope}')`;

  if (scope === "Machine") {
    await runPowerShellElevated(ps);
  } else {
    await runPowerShell(ps);
  }

  await broadcastSettingChange();
}

/**
 * Broadcast WM_SETTINGCHANGE to all top-level windows so running
 * applications pick up the environment variable changes immediately.
 */
export async function broadcastSettingChange(): Promise<void> {
  const ps = `
try {
  if (-not ([System.Management.Automation.PSTypeName]'Win32.NativeMethods').Type) {
    Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition @'
[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(
    IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
    uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@
  }
  $HWND_BROADCAST = [IntPtr]0xFFFF
  $WM_SETTINGCHANGE = 0x001A
  $SMTO_ABORTIFHUNG = 0x0002
  $result = [UIntPtr]::Zero
  [Win32.NativeMethods]::SendMessageTimeout(
    $HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero,
    'Environment', $SMTO_ABORTIFHUNG, 5000, [ref]$result
  ) | Out-Null
} catch {
  # Silently ignore - don't fail the main operation
}
`.trim();

  try {
    await runPowerShell(ps);
  } catch {
    // Non-critical: don't fail the main operation if broadcast fails
  }
}
