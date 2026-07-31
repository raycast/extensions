import {
  Clipboard,
  Toast,
  environment,
  getFrontmostApplication,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import {
  defaultVadModelPath,
  ensureSupportDirectories,
  newSessionDirectory,
} from "./lib/paths";
import {
  isProcessRunning,
  spawnDetached,
  waitForProcessExit,
} from "./lib/process";
import { buildReport } from "./lib/report";
import { clearState, readState, writeState } from "./lib/state";
import {
  resolveModelPath,
  resolveWhisperCliPath,
  transcribe,
} from "./lib/transcribe";
import { Preferences, RecordingState } from "./lib/types";

async function startRecording(preferences: Preferences): Promise<void> {
  ensureSupportDirectories();
  if (
    !existsSync(resolveModelPath(preferences)) ||
    !existsSync(defaultVadModelPath())
  ) {
    await showHUD("⚠️ Run “Download Local Whisper Model” first");
    return;
  }
  if (!resolveWhisperCliPath(preferences)) {
    await showHUD(
      "⚠️ Install whisper.cpp with Homebrew or set whisper-cli in preferences",
    );
    return;
  }
  const sessionDir = newSessionDirectory();
  const videoPath = join(sessionDir, "recording.mov");
  const display = Math.max(
    1,
    Number.parseInt(preferences.displayNumber, 10) || 1,
  );
  let application:
    Awaited<ReturnType<typeof getFrontmostApplication>> | undefined;
  try {
    application = await getFrontmostApplication();
  } catch {
    application = undefined;
  }

  const recorderLogPath = join(sessionDir, "recorder.log");
  const pid = spawnDetached(
    "/usr/sbin/screencapture",
    ["-v", "-g", "-k", "-C", `-D${display}`, videoPath],
    recorderLogPath,
  );
  const frameCapturePid = spawnDetached(
    "/bin/sh",
    [
      join(environment.assetsPath, "capture-frames.sh"),
      String(pid),
      join(sessionDir, "automatic"),
      String(display),
    ],
    join(sessionDir, "frame-capture.log"),
  );
  const state: RecordingState = {
    pid,
    frameCapturePid,
    startedAt: new Date().toISOString(),
    sessionDir,
    videoPath,
    sourceApplication: application?.name,
    sourceBundleId: application?.bundleId,
  };
  writeState(state);
  writeFileSync(
    join(sessionDir, "session.json"),
    JSON.stringify(state, null, 2),
  );
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (!isProcessRunning(pid)) {
    clearState();
    await showHUD(
      "⚠️ Allow Raycast in Screen & System Audio Recording settings",
    );
    return;
  }
  await showHUD("🔴 Agent feedback recording started");
}

async function stopRecording(
  state: RecordingState,
  preferences: Preferences,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Stopping feedback recording…",
  });
  try {
    if (isProcessRunning(state.pid)) {
      process.kill(state.pid, "SIGINT");
      await waitForProcessExit(state.pid);
    }
    if (state.frameCapturePid && isProcessRunning(state.frameCapturePid)) {
      process.kill(state.frameCapturePid, "SIGTERM");
    }
    clearState();
    if (!existsSync(state.videoPath))
      throw new Error("The recorder did not create a video file");

    toast.title = "Transcribing locally…";
    const { segments } = await transcribe(state, preferences);
    toast.title = "Extracting feedback frames…";
    const { markdown } = await buildReport(state, preferences, segments);
    await Clipboard.copy(markdown);
    toast.style = Toast.Style.Success;
    toast.title = "Feedback copied";
    toast.message = "Paste it into your agent when ready";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not prepare feedback";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const state = readState();
  if (state && isProcessRunning(state.pid)) {
    await stopRecording(state, preferences);
    return;
  }
  if (state) clearState();
  await startRecording(preferences);
}
