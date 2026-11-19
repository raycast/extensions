import { showToast, Toast } from "@raycast/api";
import { LaunchProps, showHUD } from "@raycast/api";
import crypto from "node:crypto";
import { detectActivePlayback } from "./lib/probe";
import { clearClipInState, enqueueTask, readClipInState, spawnDetachedWorker } from "./lib/queue";
import { loadRuntimeConfig } from "./lib/raycast-config";
import { ClipQueueTask } from "./lib/types";

export default async function Command(props: LaunchProps<{ arguments: { flags?: string } }>) {
  try {
    const config = loadRuntimeConfig();
    const probe = await detectActivePlayback(config);

    if (!probe) {
      await showHUD("❌ No video is playing");
      return;
    }

    const savedIn = readClipInState(config.supportPath);
    clearClipInState(config.supportPath);

    let startSec: number;
    let endSec = probe.positionSec;
    let hint: string;

    if (!savedIn) {
      startSec = Math.max(0, endSec - 15.0);
      hint = "⚡️ Last 15s";
    } else {
      startSec = savedIn.startSec;
      if (endSec < startSec) {
        [startSec, endSec] = [endSec, startSec];
      }
      hint = `🎬 Duration ${(endSec - startSec).toFixed(1)}s`;
    }

    const durationSec = Math.max(1.0, endSec - startSec);
    const rawFlags = (props.arguments?.flags ?? "").toLowerCase();
    const burnSubtitles = rawFlags.includes("burn") || rawFlags.includes("hard") || rawFlags.includes("硬");

    const task: ClipQueueTask = {
      id: crypto.randomUUID(),
      type: "clip",
      createdAt: Date.now(),
      probe,
      startSec,
      endSec,
      durationSec,
      burnSubtitles,
      config,
    };

    const { shots, clips } = enqueueTask(config.supportPath, task);
    await spawnDetachedWorker(config);

    await showHUD(`${hint} queued · Queue: ${shots} frames / ${clips} clips`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't read playback session",
      message: error instanceof Error ? error.message : "Check your player and Jellyfin/Emby settings",
    });
  }
}
