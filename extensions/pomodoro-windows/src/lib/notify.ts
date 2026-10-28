import { environment } from "@raycast/api";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { Prefs } from "./prefs";

/**
 * Native Windows notifications for interval endings.
 *
 * Raycast unloads an extension a few seconds after a command finishes, and any process the
 * extension started goes with it, so a "sleep until the end, then beep" child process never gets
 * to fire. Instead the alarm is handed to Windows Task Scheduler: a one-time task for the current
 * user that runs a small inline PowerShell command at the exact end time. It runs whether or not
 * Raycast is open, and if the PC was asleep it runs as soon as it wakes.
 *
 * The script writes a marker file when it runs, so the extension can tell if an alarm didn't fire
 * and notify through another route. It also opens a raycast:// deeplink that wakes the extension in
 * the background, so Raycast shows its own HUD at the same moment.
 */

export const isWindows = process.platform === "win32";

const ALARM_TASK = "Raycast Pomodoro Alarm";
const NOW_TASK = "Raycast Pomodoro Notify";

// AppUserModelID of Windows PowerShell; lets an unpackaged script raise a toast.
const POWERSHELL_APP_ID = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe";

function supportFile(name: string): string {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  return path.join(environment.supportPath, name);
}

function psString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface AlertContent {
  title: string;
  body: string;
}

/** The script that runs when the alarm fires: marker, toast (with balloon fallback), sound. */
export function buildAlertScript(
  content: AlertContent,
  prefs: Pick<Prefs, "enableToast" | "enableSound" | "sound" | "customSound">,
  marker?: { path: string; value: string },
  wakeUrl?: string,
): string {
  const lines: string[] = ["$ErrorActionPreference = 'SilentlyContinue'"];

  if (marker) {
    lines.push(`Set-Content -LiteralPath ${psString(marker.path)} -Value ${psString(marker.value)} -Encoding UTF8`);
  }

  // Wake the extension in Raycast so it shows its own HUD, even if Windows notifications are off.
  if (wakeUrl) lines.push(`try { Start-Process ${psString(wakeUrl)} } catch {}`);

  if (prefs.enableToast) {
    const xml =
      `<toast scenario="reminder"><visual><binding template="ToastGeneric">` +
      `<text>${xmlEscape(content.title)}</text><text>${xmlEscape(content.body)}</text>` +
      `</binding></visual><actions><action content="OK" arguments="dismiss" activationType="system"/></actions>` +
      `<audio silent="true"/></toast>`;
    lines.push(
      "$shown = $false",
      "try {",
      "  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null",
      "  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null",
      "  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument",
      `  $xml.LoadXml(${psString(xml)})`,
      "  $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)",
      `  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(${psString(POWERSHELL_APP_ID)}).Show($toast)`,
      "  $shown = $true",
      "} catch {}",
      "if (-not $shown) {",
      "  try {",
      "    Add-Type -AssemblyName System.Windows.Forms, System.Drawing",
      "    $n = New-Object System.Windows.Forms.NotifyIcon",
      "    $n.Icon = [System.Drawing.SystemIcons]::Information",
      "    $n.Visible = $true",
      `    $n.ShowBalloonTip(10000, ${psString(content.title)}, ${psString(content.body || " ")}, 'Info')`,
      "  } catch {}",
      "}",
    );
  }

  if (prefs.enableSound) {
    const pathExpr = prefs.customSound
      ? psString(prefs.customSound)
      : `(Join-Path $env:WINDIR ${psString(`Media\\${prefs.sound}`)})`;
    lines.push(
      `$p = ${pathExpr}`,
      "if (Test-Path -LiteralPath $p) {",
      "  try { (New-Object System.Media.SoundPlayer $p).PlaySync() } catch { [System.Media.SystemSounds]::Exclamation.Play(); Start-Sleep -Seconds 1 }",
      "} else { [System.Media.SystemSounds]::Exclamation.Play(); Start-Sleep -Seconds 1 }",
    );
  }

  // Keep a fallback balloon on screen long enough to be seen before the process exits.
  if (prefs.enableToast) lines.push("if (-not $shown -and $n) { Start-Sleep -Seconds 8; $n.Dispose() }");

  return lines.join("\r\n");
}

function encode(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

/**
 * Script that (re)registers a one-time task running `alertScript`, either at `firesAt` or right now.
 *
 * The alert is passed inline with -EncodedCommand rather than as a .ps1 file: many PCs (including
 * ones managed by Group Policy) block script files outright, which overrides -ExecutionPolicy
 * Bypass, while inline commands still run.
 */
export function buildRegisterScript(taskName: string, alertScript: string, firesAt?: number): string {
  const runner = `-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand ${encode(alertScript)}`;
  const lines = [
    "$ErrorActionPreference = 'Stop'",
    // Windows 11's console host can run PowerShell with no window at all; older builds briefly flash one.
    "if ([Environment]::OSVersion.Version.Build -ge 22000) {",
    `  $action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument ${psString(`--headless powershell.exe ${runner}`)}`,
    "} else {",
    `  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ${psString(runner)}`,
    "}",
    "$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name",
    "$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited",
    "$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances Parallel",
  ];
  if (firesAt !== undefined) {
    lines.push(
      `$at = [DateTimeOffset]::FromUnixTimeMilliseconds(${Math.round(firesAt)}).LocalDateTime`,
      "$trigger = New-ScheduledTaskTrigger -Once -At $at",
      `Register-ScheduledTask -TaskName ${psString(taskName)} -Action $action -Principal $principal -Settings $settings -Trigger $trigger -Force | Out-Null`,
    );
  } else {
    lines.push(
      `Register-ScheduledTask -TaskName ${psString(taskName)} -Action $action -Principal $principal -Settings $settings -Force | Out-Null`,
      `Start-ScheduledTask -TaskName ${psString(taskName)}`,
    );
  }
  return lines.join("\r\n");
}

function runPowerShell(script: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!isWindows) return resolve({ ok: false, error: "Not running on Windows" });
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encode(script)],
      { windowsHide: true, timeout: 20_000 },
      (err, _stdout, stderr) => {
        if (err) resolve({ ok: false, error: (stderr || err.message).trim().split(/\r?\n/)[0] });
        else resolve({ ok: true });
      },
    );
  });
}

/** Whether any native alert (toast or sound) is turned on. */
export function nativeAlertsEnabled(prefs: Prefs): boolean {
  return isWindows && (prefs.enableToast || prefs.enableSound);
}

const markerPath = () => supportFile("alarm-fired.txt");

/** True if the alarm scheduled for `firesAt` has run. */
export function alarmFired(firesAt: number): boolean {
  try {
    return (
      fs
        .readFileSync(markerPath(), "utf8")
        .replace(/^\uFEFF/, "")
        .trim() === String(firesAt)
    );
  } catch {
    return false;
  }
}

/**
 * Schedule the end-of-interval alert. Replaces any previously scheduled one.
 * The alarm is scheduled even when toast and sound are off, so `wakeUrl` can still trigger the
 * Raycast HUD on time.
 */
export async function scheduleAlarm(
  firesAt: number,
  content: AlertContent,
  prefs: Prefs,
  wakeUrl?: string,
): Promise<boolean> {
  if (!isWindows) return false;
  const script = buildAlertScript(content, prefs, { path: markerPath(), value: String(firesAt) }, wakeUrl);
  const result = await runPowerShell(buildRegisterScript(ALARM_TASK, script, firesAt));
  if (!result.ok) console.error("Failed to schedule alarm:", result.error);
  return result.ok;
}

/** Cancel the scheduled alert (pause, stop). */
export async function cancelAlarm(): Promise<void> {
  if (!isWindows) return;
  await runPowerShell(
    `Unregister-ScheduledTask -TaskName ${psString(ALARM_TASK)} -Confirm:$false -ErrorAction SilentlyContinue`,
  );
}

/** Show an alert right away, independent of Raycast's lifetime. */
export async function notifyNow(content: AlertContent, prefs: Prefs): Promise<boolean> {
  if (!nativeAlertsEnabled(prefs)) return false;
  const result = await runPowerShell(buildRegisterScript(NOW_TASK, buildAlertScript(content, prefs)));
  return result.ok;
}

/**
 * Runs a real alert through the same Task Scheduler path and checks that it actually executed.
 * Returns a human-readable problem, or undefined if it worked.
 */
export async function testAlarm(prefs: Prefs): Promise<string | undefined> {
  if (!isWindows) return "Alerts only work on Windows";
  if (!prefs.enableToast && !prefs.enableSound) return "Notifications and sound are both turned off in Preferences";
  const marker = supportFile("test-fired.txt");
  const token = String(Date.now());
  try {
    fs.rmSync(marker, { force: true });
  } catch {
    // ignore
  }
  const script = buildAlertScript(
    { title: "🍅 Pomodoro test", body: "This is how the end of an interval will look and sound." },
    prefs,
    { path: marker, value: token },
  );
  const result = await runPowerShell(buildRegisterScript(NOW_TASK, script));
  if (!result.ok) return `Couldn't create the Windows task: ${result.error}`;

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      if (fs.readFileSync(marker, "utf8").includes(token)) return undefined;
    } catch {
      // not yet
    }
  }
  return "The Windows task was created but didn't run. Check Task Scheduler for “Raycast Pomodoro Notify”.";
}
