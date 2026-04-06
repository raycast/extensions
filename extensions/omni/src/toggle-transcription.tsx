import {
  ensureDaemon,
  getStopMode,
  omni,
  type DaemonResponse,
  type TranscribeStatusResponse,
} from "./lib/omni";

export default async function Command() {
  let recording = false;
  try {
    const status = await omni<TranscribeStatusResponse>([
      "transcribe",
      "status",
    ]);
    recording = status.recording;
  } catch {
    // Daemon may not be running yet.
  }

  if (recording) {
    const mode = getStopMode();
    const args = mode ? ["transcribe", "stop", mode] : ["transcribe", "stop"];
    await omni<DaemonResponse>(args);
  } else {
    await ensureDaemon();
    await omni<DaemonResponse>(["transcribe", "start", "--background"]);
  }
}
