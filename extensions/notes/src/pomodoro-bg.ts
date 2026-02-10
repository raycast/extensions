import { updateCommandMetadata } from "@raycast/api";
import {
  loadState,
  persistState,
  computeRemaining,
  formatTime,
  LABELS,
  playCompletionSound,
  pauseSpotify,
} from "./pomodoro-state";
import { loadTimers, saveTimers } from "./quick-timer";
import { exec } from "child_process";

function fireTimerNotification(label: string) {
  const safeLabel = label.replace(/'/g, "''");
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$n = New-Object System.Windows.Forms.NotifyIcon",
    "$n.Icon = [System.Drawing.SystemIcons]::Information",
    "$n.Visible = $true",
    `$n.ShowBalloonTip(5000, 'Timer Done', '${safeLabel}', [System.Windows.Forms.ToolTipIcon]::Info)`,
    "[System.Media.SystemSounds]::Asterisk.Play()",
    "Start-Sleep -Seconds 6",
    "$n.Dispose()",
  ].join("; ");
  // Use -EncodedCommand to avoid $-escaping issues
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  exec(`powershell -WindowStyle Hidden -EncodedCommand ${encoded}`, { windowsHide: true });
}

export default async function PomodoroBackground() {
  // --- Check quick timers ---
  const timers = await loadTimers();
  const now = Date.now();
  let timersChanged = false;
  for (const timer of timers) {
    if (!timer.notified && now >= timer.expiresAt) {
      fireTimerNotification(timer.label);
      timer.notified = true;
      timersChanged = true;
    }
  }
  if (timersChanged) {
    // Remove notified timers
    await saveTimers(timers.filter((t) => !t.notified));
  }

  // --- Pomodoro status ---
  const state = await loadState();

  if (!state) {
    await updateCommandMetadata({ subtitle: "" });
    return;
  }

  const remaining = computeRemaining(state);

  if (remaining <= 0 && !state.isRunning) {
    await updateCommandMetadata({ subtitle: `${LABELS[state.sessionType]} done!` });
    return;
  }

  if (remaining <= 0 && state.isRunning) {
    if (!state.soundPlayed) {
      playCompletionSound();
      pauseSpotify();
      await persistState({ ...state, isRunning: false, remainingAtStart: 0, soundPlayed: true });
    }
    await updateCommandMetadata({ subtitle: `${LABELS[state.sessionType]} done!` });
    return;
  }

  const prefix = state.isRunning ? LABELS[state.sessionType] : `${LABELS[state.sessionType]} (paused)`;
  await updateCommandMetadata({ subtitle: `${prefix} — ${formatTime(remaining)}` });
}
