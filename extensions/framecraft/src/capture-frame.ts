import { showToast, Toast } from "@raycast/api";
import { LaunchProps, showHUD } from "@raycast/api";
import crypto from "node:crypto";
import { formatHmsDisplay, parseCaptureFlags } from "./lib/env";
import { detectActivePlayback } from "./lib/probe";
import { enqueueTask, spawnDetachedWorker } from "./lib/queue";
import { loadRuntimeConfig } from "./lib/raycast-config";
import { ScreenshotQueueTask } from "./lib/types";

export default async function Command(props: LaunchProps<{ arguments: { flags?: string } }>) {
  const triggerAt = new Date().toISOString();
  try {
    const config = loadRuntimeConfig();
    const id = crypto.randomUUID();
    const probe = await detectActivePlayback(config);

    if (!probe) {
      await showHUD("❌ No playback session found (make sure IINA, QuickTime, or Jellyfin/Emby is playing)");
      return;
    }

    if (probe.playbackObservation) probe.playbackObservation.triggerAt = triggerAt;
    const rawFlags = props.arguments?.flags || "";
    const playlistMatch = /(?:^|\s)playlist=(\d{1,5})(?:\s|$)/i.exec(rawFlags);
    if (playlistMatch) probe.playlist = Number(playlistMatch[1]);
    const flags = parseCaptureFlags(rawFlags, config.defaultSubtitleMode);
    const task: ScreenshotQueueTask = {
      id,
      type: "screenshot",
      createdAt: Date.now(),
      probe,
      flags,
      config,
    };

    const { shots, clips } = enqueueTask(config.supportPath, task);
    await spawnDetachedWorker(config);

    const timeStr = formatHmsDisplay(probe.positionSec);
    const modeTag = flags.mode === "bilingual" ? " [Bilingual]" : flags.mode === "clean" ? " [Clean]" : "";
    await showHUD(`🎯 Captured ${timeStr}${modeTag} · Queue: ${shots} frames / ${clips} clips`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't submit frame capture",
      message: error instanceof Error ? error.message : "Check your player and Jellyfin/Emby settings",
    });
  }
}
