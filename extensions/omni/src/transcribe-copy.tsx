import {
  ensureDaemon,
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
    await omni<DaemonResponse>(["transcribe", "stop", "copy"]);
  } else {
    await ensureDaemon();
    await omni<DaemonResponse>(["transcribe", "start", "--background"]);
  }
}
