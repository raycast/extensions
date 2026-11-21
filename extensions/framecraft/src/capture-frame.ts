import { LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import crypto from "node:crypto";
import { formatHmsDisplay, parseCaptureFlags } from "./lib/env";
import { detectActivePlayback } from "./lib/probe";
import { enqueueTask } from "./lib/queue";
import { loadRuntimeConfig } from "./lib/raycast-config";
import { assertReadableVideoSource } from "./lib/source-format";
import { runQueue } from "./lib/task-runner";
import { ScreenshotQueueTask } from "./lib/types";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.CaptureFrame; launchContext?: { resumeQueue?: boolean } }>,
) {
  // The gallery launches this command to run queued or retried tasks.
  if (props.launchContext?.resumeQueue) {
    await processQueue();
    return;
  }
  const triggerAt = new Date().toISOString();
  try {
    const config = loadRuntimeConfig();
    const probe = await detectActivePlayback(config);
    if (!probe) {
      await showHUD("❌ No playback session found (make sure IINA, QuickTime, or Jellyfin/Emby is playing)");
      return;
    }
    assertReadableVideoSource(probe);
    if (probe.playbackObservation) probe.playbackObservation.triggerAt = triggerAt;
    const flags = parseCaptureFlags(props.arguments?.flags, config.defaultSubtitleMode);
    const task: ScreenshotQueueTask = {
      id: crypto.randomUUID(),
      type: "screenshot",
      createdAt: Date.now(),
      probe,
      flags,
      config,
    };
    const { shots, clips } = enqueueTask(config.supportPath, task);
    const modeTag = flags.mode === "bilingual" ? " [Bilingual]" : flags.mode === "clean" ? " [Clean]" : "";
    await showHUD(
      `🎯 Capturing ${formatHmsDisplay(probe.positionSec)}${modeTag} · Queue: ${shots} frames / ${clips} clips`,
    );
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't submit frame capture" });
    return;
  }
  // The capture runs inside this command; Raycast keeps it alive after the window closes.
  await processQueue();
}

async function processQueue() {
  try {
    await runQueue(loadRuntimeConfig().supportPath);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't run the task queue" });
  }
}
