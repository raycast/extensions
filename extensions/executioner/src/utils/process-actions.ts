import { exec } from "child_process";
import { closeMainWindow, showToast, Toast } from "@raycast/api";
import type { KilledEntry, Preferences, Process } from "../types";

type AddKillEntry = (entry: KilledEntry) => void;

export function killProcess(
  proc: Process,
  prefs: Preferences,
  addKillEntry?: AddKillEntry,
) {
  exec(`kill ${proc.pid}`, (err) => {
    if (err) {
      showToast({
        title: `Failed to kill ${proc.name}`,
        message: err.message,
        style: Toast.Style.Failure,
      });
      return;
    }
    showToast({ title: `Killed ${proc.name}`, style: Toast.Style.Success });
    addKillEntry?.({
      pid: proc.pid,
      name: proc.name,
      comm: proc.comm,
      killedAt: Date.now(),
    });
    if (prefs.closeAfterKill) closeMainWindow();
  });
}

export function forceKillProcess(
  proc: Process,
  prefs: Preferences,
  addKillEntry?: AddKillEntry,
) {
  exec(`kill -9 ${proc.pid}`, (err) => {
    if (err) {
      showToast({
        title: `Failed to force kill ${proc.name}`,
        message: err.message,
        style: Toast.Style.Failure,
      });
      return;
    }
    showToast({
      title: `Force killed ${proc.name}`,
      style: Toast.Style.Success,
    });
    addKillEntry?.({
      pid: proc.pid,
      name: proc.name,
      comm: proc.comm,
      killedAt: Date.now(),
    });
    if (prefs.closeAfterKill) closeMainWindow();
  });
}

export function sudoForceKill(
  proc: Process,
  prefs: Preferences,
  addKillEntry?: AddKillEntry,
) {
  const script = `osascript -e 'do shell script "kill -9 ${proc.pid}" with administrator privileges'`;
  exec(script, (err) => {
    if (err) {
      showToast({
        title: `Failed to sudo kill ${proc.name}`,
        message: err.message,
        style: Toast.Style.Failure,
      });
      return;
    }
    showToast({
      title: `Sudo killed ${proc.name}`,
      style: Toast.Style.Success,
    });
    addKillEntry?.({
      pid: proc.pid,
      name: proc.name,
      comm: proc.comm,
      killedAt: Date.now(),
    });
    if (prefs.closeAfterKill) closeMainWindow();
  });
}

export function freezeProcess(proc: Process) {
  exec(`kill -STOP ${proc.pid}`, (err) => {
    if (err) {
      showToast({
        title: `Failed to freeze ${proc.name}`,
        message: err.message,
        style: Toast.Style.Failure,
      });
      return;
    }
    showToast({
      title: `Froze ${proc.name}`,
      message: "Process paused (SIGSTOP)",
      style: Toast.Style.Success,
    });
  });
}

export function resumeProcess(proc: Process) {
  exec(`kill -CONT ${proc.pid}`, (err) => {
    if (err) {
      showToast({
        title: `Failed to resume ${proc.name}`,
        message: err.message,
        style: Toast.Style.Failure,
      });
      return;
    }
    showToast({
      title: `Resumed ${proc.name}`,
      message: "Process resumed (SIGCONT)",
      style: Toast.Style.Success,
    });
  });
}

export function reniceProcess(proc: Process, adjustment: number) {
  const newNice = Math.max(-20, Math.min(20, proc.nice + adjustment));
  const cmd =
    adjustment < 0
      ? `osascript -e 'do shell script "renice ${newNice} -p ${proc.pid}" with administrator privileges'`
      : `renice ${newNice} -p ${proc.pid}`;

  exec(cmd, (err) => {
    if (err) {
      showToast({
        title: `Failed to renice ${proc.name}`,
        message: err.message,
        style: Toast.Style.Failure,
      });
      return;
    }
    showToast({
      title: `Reniced ${proc.name}`,
      message: `Priority: ${proc.nice} → ${newNice}`,
      style: Toast.Style.Success,
    });
  });
}

export function killMultiple(
  procs: Process[],
  force: boolean,
  addKillEntry?: AddKillEntry,
) {
  const signal = force ? "-9 " : "";
  let killed = 0;
  let failed = 0;

  for (const proc of procs) {
    try {
      exec(`kill ${signal}${proc.pid}`, (err) => {
        if (err) {
          failed++;
        } else {
          killed++;
          addKillEntry?.({
            pid: proc.pid,
            name: proc.name,
            comm: proc.comm,
            killedAt: Date.now(),
          });
        }
        if (killed + failed === procs.length) {
          showToast({
            title: `Killed ${killed} process${killed !== 1 ? "es" : ""}${failed > 0 ? `, ${failed} failed` : ""}`,
            style: killed > 0 ? Toast.Style.Success : Toast.Style.Failure,
          });
        }
      });
    } catch {
      failed++;
    }
  }
}

export function killDuplicates(procs: Process[], addKillEntry?: AddKillEntry) {
  // Keep the one with the lowest PID, kill the rest
  const sorted = [...procs].sort((a, b) => a.pid - b.pid);
  const toKill = sorted.slice(1);
  if (toKill.length === 0) {
    showToast({ title: "No duplicates to kill", style: Toast.Style.Failure });
    return;
  }
  killMultiple(toKill, false, addKillEntry);
}
