import {
  Clipboard,
  Toast,
  environment,
  getFrontmostApplication,
  getPreferenceValues,
  showHUD,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { startDomContextBridge, stopDomContextBridge } from "./lib/dom-context";
import { ensureSupportDirectories, newSessionDirectory } from "./lib/paths";
import {
  isSameProcess,
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
import {
  DomContextBridgeState,
  ProcessIdentity,
  RecordingState,
} from "./lib/types";

async function setRecordingStatus(subtitle: string): Promise<void> {
  try {
    await updateCommandMetadata({ subtitle });
  } catch {
    // Recording should still work if Raycast cannot persist command metadata.
  }
}

function terminateProcess(
  identity: ProcessIdentity | undefined,
  signal: NodeJS.Signals,
): void {
  if (!identity || !isSameProcess(identity)) return;
  try {
    process.kill(identity.pid, signal);
  } catch {
    // Startup cleanup is best-effort and should continue for other processes.
  }
}

async function cleanUpFailedStart(
  recorder: ProcessIdentity | undefined,
  frameCapture: ProcessIdentity | undefined,
  domContext: DomContextBridgeState | undefined,
): Promise<void> {
  terminateProcess(frameCapture, "SIGTERM");
  stopDomContextBridge(domContext);
  if (recorder && isSameProcess(recorder)) {
    terminateProcess(recorder, "SIGINT");
    try {
      await waitForProcessExit(recorder, 3_000);
    } catch {
      terminateProcess(recorder, "SIGTERM");
    }
  }
  clearState();
  await setRecordingStatus("Ready to Record");
}

async function startRecording(
  preferences: Preferences.ToggleRecording,
): Promise<void> {
  ensureSupportDirectories();
  if (!existsSync(resolveModelPath(preferences))) {
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

  let recorder: ProcessIdentity | undefined;
  let frameCapture: ProcessIdentity | undefined;
  let domContext: DomContextBridgeState | undefined;
  try {
    recorder = await spawnDetached(
      "/usr/sbin/screencapture",
      ["-v", "-g", "-k", "-C", `-D${display}`, videoPath],
      join(sessionDir, "recorder.log"),
    );
    domContext = await startDomContextBridge(sessionDir, recorder.pid);
    frameCapture = await spawnDetached(
      "/bin/sh",
      [
        join(environment.assetsPath, "capture-frames.sh"),
        String(recorder.pid),
        join(sessionDir, "automatic"),
        String(display),
      ],
      join(sessionDir, "frame-capture.log"),
    );
    const state: RecordingState = {
      recorder,
      frameCapture,
      domContext,
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
    await setRecordingStatus("● Recording — Run to Stop");
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (!isSameProcess(recorder)) {
      throw new Error(
        "Allow Raycast in Screen & System Audio Recording settings",
      );
    }
    await showHUD("🔴 Recording started — run this command again to stop");
  } catch (error) {
    await cleanUpFailedStart(recorder, frameCapture, domContext);
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`⚠️ Could not start recording: ${message}`);
  }
}

async function stopRecording(
  state: RecordingState,
  preferences: Preferences.ToggleRecording,
): Promise<void> {
  await setRecordingStatus("Stopping Recording…");
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Stopping feedback recording…",
  });
  try {
    if (isSameProcess(state.recorder)) {
      process.kill(state.recorder.pid, "SIGINT");
      await waitForProcessExit(state.recorder);
    }
    if (isSameProcess(state.frameCapture)) {
      process.kill(state.frameCapture.pid, "SIGTERM");
    }
    stopDomContextBridge(state.domContext);
    clearState();
    await setRecordingStatus("Recording Stopped — Preparing Feedback");
    await showHUD("⏹ Recording stopped — preparing feedback");
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
  } finally {
    await setRecordingStatus("Ready to Record");
  }
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences.ToggleRecording>();
  const state = readState();
  if (state && isSameProcess(state.recorder)) {
    await stopRecording(state, preferences);
    return;
  }
  if (state) {
    stopDomContextBridge(state.domContext);
    clearState();
    await setRecordingStatus("Ready to Record");
  }
  await startRecording(preferences);
}
