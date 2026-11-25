/**
 * Background alert for a running timer.
 *
 * When a timer starts we launch a hidden Windows PowerShell process. It waits until the timer's end time
 * (checking the wall clock, so laptop sleep or a slow start don't shift it), re-reading the state file about
 * once a second. As soon as the timer was paused, stopped or rescheduled (its token changed), the process exits
 * on its own. When the end time is reached and the timer is still the same, it shows a native Windows
 * notification. Nothing is ever killed by PID, so an unrelated process can never be affected.
 *
 * Pure module apart from node:child_process: no @raycast/api import, so the script builders are unit-testable.
 */
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import type { AlertSound, Timer } from "./types.ts";
import { formatHuman } from "./format.ts";

/** App id of Raycast for Windows, so the notification shows Raycast's name and icon. */
export const RAYCAST_APP_ID = "Raycast.Raycast_qypenmj9wpt2a!Raycast";

/** Windows' own light/dark setting for system surfaces such as notifications (0 = dark). */
const THEME_KEY = String.raw`HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize`;

export interface AlertContext {
  statePath: string;
  sound: AlertSound;
  /** PNG shown in the notification when Windows uses the light theme. */
  iconPath?: string;
  /** PNG shown when Windows uses the dark theme (falls back to iconPath). */
  darkIconPath?: string;
  /** Deeplink that starts a new 5-minute timer, e.g. raycast://extensions/<author>/<name>/start-timer?... */
  snoozeLink?: string;
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/**
 * PowerShell single-quoted string literal. PowerShell treats the curly quotes ‘ ’ ‚ ‛ like ', so every one of them
 * is doubled too (a label such as "Mom’s tea" would otherwise end the string early and break the script).
 */
export const psQuote = (s: string) => `'${s.replace(/['‘’‚‛]/g, (q) => q + q)}'`;

export function buildToastXml(timer: Timer, ctx: AlertContext, iconPath: string | undefined = ctx.iconPath): string {
  const title = timer.label ? `${timer.label} is done ✨` : "Time's up ✨";
  const body = `${formatHuman(timer.durationMs)} complete. Nice work, take a breath.`;
  const scenario = ctx.sound === "alarm" ? "alarm" : "reminder";
  const audio =
    ctx.sound === "silent"
      ? `<audio silent="true"/>`
      : ctx.sound === "alarm"
        ? `<audio src="ms-winsoundevent:Notification.Looping.Alarm2" loop="true"/>`
        : `<audio src="ms-winsoundevent:Notification.Reminder"/>`;
  const logo = iconPath ? `<image placement="appLogoOverride" src="${xmlEscape(pathToFileURL(iconPath).href)}"/>` : "";
  const snooze = ctx.snoozeLink
    ? `<action content="5 more minutes" activationType="protocol" arguments="${xmlEscape(ctx.snoozeLink)}"/>`
    : "";
  return (
    `<toast scenario="${scenario}">` +
    `<visual><binding template="ToastGeneric"><text>${xmlEscape(title)}</text><text>${xmlEscape(body)}</text>${logo}</binding></visual>` +
    audio +
    `<actions>${snooze}<action content="Dismiss" arguments="dismiss" activationType="system"/></actions>` +
    `</toast>`
  );
}

/** The PowerShell script run by the hidden alert process. */
export function buildAlertScript(timer: Timer, ctx: AlertContext): string {
  return [
    `$ErrorActionPreference = 'Stop'`,
    `$statePath = ${psQuote(ctx.statePath)}`,
    `$timerId = ${psQuote(timer.id)}`,
    `$token = ${psQuote(timer.token)}`,
    `$endsAt = [long]${Math.round(timer.endsAt)}`,
    // Is this still the same timer (same token), running or just finished? An open Sandglass view may mark it
    // finished a moment before this process looks; paused, stopped or rescheduled timers fail the check.
    `function Test-Current {`,
    `  try {`,
    `    $state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json`,
    `    $t = @($state.timers) | Where-Object { $_.id -eq $timerId } | Select-Object -First 1`,
    `    return ($null -ne $t -and $t.token -eq $token -and ($t.status -eq 'running' -or $t.status -eq 'finished'))`,
    `  } catch { return $true }`, // A half-written file must not cancel the alert; the next check decides.
    `}`,
    // Load the notification APIs before waiting, so it appears right on time.
    `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null`,
    `[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null`,
    `$lightXml = ${psQuote(buildToastXml(timer, ctx))}`,
    `$darkXml = ${psQuote(buildToastXml(timer, ctx, ctx.darkIconPath ?? ctx.iconPath))}`,
    // Use Raycast's usual app id, or look up the installed one (e.g. a different build) so the toast still shows.
    `$appId = ${psQuote(RAYCAST_APP_ID)}`,
    `try {`,
    `  $apps = @(Get-StartApps)`,
    `  if (-not ($apps | Where-Object { $_.AppID -eq $appId })) {`,
    `    $match = $apps | Where-Object { $_.Name -like 'Raycast*' -and $_.AppID -like '*!*' } | Select-Object -First 1`,
    `    if ($match) { $appId = $match.AppID }`,
    `  }`,
    `} catch {}`,
    `$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)`,
    `while ($true) {`,
    `  $wait = $endsAt - [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()`,
    `  if ($wait -le 0) { break }`,
    `  if (-not (Test-Current)) { exit 0 }`,
    `  Start-Sleep -Milliseconds ([Math]::Min($wait, 1000))`,
    `}`,
    `if (-not (Test-Current)) { exit 0 }`,
    // Match the icon to the Windows light/dark setting at the moment the notification appears.
    `$light = 1`,
    `try { $light = (Get-ItemProperty -LiteralPath ${psQuote(THEME_KEY)} -Name SystemUsesLightTheme).SystemUsesLightTheme } catch {}`,
    `$xml = New-Object Windows.Data.Xml.Dom.XmlDocument`,
    `$xml.LoadXml($(if ($light -eq 0) { $darkXml } else { $lightXml }))`,
    `$notifier.Show((New-Object Windows.UI.Notifications.ToastNotification $xml))`,
  ].join("\n");
}

/**
 * Command-line arguments for the alert process. The script is passed base64-encoded (UTF-16LE) only so that its
 * quotes and XML survive Windows command-line parsing; the readable source is buildAlertScript above. Inline
 * commands are not subject to the execution policy, and spawn's windowsHide keeps the console hidden.
 */
export function alertProcessArgs(script: string): string[] {
  return ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")];
}

/** Starts the hidden alert process and returns its PID (undefined if it could not be started). */
export function scheduleAlert(timer: Timer, ctx: AlertContext): number | undefined {
  if (timer.status !== "running") return undefined;
  try {
    const child = spawn("powershell.exe", alertProcessArgs(buildAlertScript(timer, ctx)), {
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => undefined); // e.g. PowerShell missing: the in-app countdown still works.
    child.unref();
    return child.pid;
  } catch {
    return undefined;
  }
}

/** True if a process with this PID exists. Used to re-arm an alert after Raycast restarted. */
export function isProcessAlive(pid: number | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}
