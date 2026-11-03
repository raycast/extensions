import {
  Alert,
  LaunchType,
  confirmAlert,
  environment,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";

import { EngineError, startDaemon, stopDaemon } from "./lib/engine";
import { getDaemonStatus, type DaemonStatus } from "./lib/rpc";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function subtitleFor(status: DaemonStatus): string {
  if (status.state === "stopped") {
    return "⚪ Stopped · Click to start";
  }
  if (status.state === "error") {
    return "🔴 RPC error";
  }
  const counts: string[] = [];
  if (status.active > 0) counts.push(`${status.active} active`);
  if (status.waiting > 0) counts.push(`${status.waiting} waiting`);
  if (counts.length === 0) return "🟢 Running";
  return `🟡 Busy · ${counts.join(" · ")}`;
}

async function updateSubtitle(status: DaemonStatus): Promise<void> {
  try {
    await updateCommandMetadata({ subtitle: subtitleFor(status) });
  } catch {
    // Metadata updates are best-effort; the toggle must still work.
  }
}

export default async function Toggle() {
  if (environment.launchType === LaunchType.Background) {
    await updateSubtitle(await getDaemonStatus());
    return;
  }

  const current = await getDaemonStatus();
  try {
    if (current.state === "stopped") {
      await startDaemon();
      await showHUD("aria2 started");
    } else {
      await stopDaemon({ onlyIfIdle: true });
      await showHUD("aria2 stopped");
    }
  } catch (error) {
    const busy = error instanceof EngineError && error.code === 5;
    if (busy) {
      const force = await confirmAlert({
        title: "aria2 is busy",
        message:
          "Active or queued downloads will be interrupted. Force stop aria2?",
        primaryAction: {
          title: "Force Stop",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: { title: "Cancel" },
      });
      if (force) {
        try {
          await stopDaemon({ onlyIfIdle: false, force: true });
          await showHUD("aria2 force-stopped");
        } catch (forceError) {
          await showHUD(`aria2: ${messageOf(forceError)}`);
        }
      } else {
        await showHUD("aria2 is busy; stop refused");
      }
    } else {
      await showHUD(`aria2: ${messageOf(error)}`);
    }
  }

  await updateSubtitle(await getDaemonStatus());
}
