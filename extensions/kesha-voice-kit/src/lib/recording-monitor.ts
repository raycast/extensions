import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { METER_INTERVAL_MS } from "./dictation-config";
import type { RecordingPatch, SignalLevel } from "./dictation-types";
import { parseDefaultMicInfo } from "./mic-info";
import { startLiveMicMeter } from "./signal-meter";

const execFileAsync = promisify(execFile);

export interface RecordingMonitorDeps {
  now?: () => number;
  setInterval?: typeof setInterval;
  clearInterval?: typeof clearInterval;
  resolveDefaultMicInfo?: () => Promise<RecordingPatch["mic"]>;
  startLiveMicMeter?: (onSignal: (signal: SignalLevel) => void) => () => void;
}

export function startRecordingMonitor(
  onPatch: (patch: RecordingPatch) => void,
  deps: RecordingMonitorDeps = {},
): () => void {
  const now = deps.now ?? Date.now;
  const schedule = deps.setInterval ?? setInterval;
  const unschedule = deps.clearInterval ?? clearInterval;
  const startedAt = now();
  let stopped = false;

  const update = (patch: RecordingPatch) => {
    if (!stopped) onPatch(patch);
  };

  void (deps.resolveDefaultMicInfo ?? resolveDefaultMicInfo)().then((mic) =>
    update({ mic }),
  );
  const stopMeter = (deps.startLiveMicMeter ?? startLiveMicMeter)((signal) =>
    update({ signal }),
  );

  const tick = () => {
    update({
      elapsedSeconds: Math.max(0, Math.floor((now() - startedAt) / 1000)),
    });
  };

  tick();
  const timer = schedule(tick, METER_INTERVAL_MS);
  return () => {
    stopped = true;
    unschedule(timer);
    stopMeter();
  };
}

export async function resolveDefaultMicInfo() {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/system_profiler", [
      "SPAudioDataType",
      "-json",
    ]);
    return parseDefaultMicInfo(stdout);
  } catch {
    return { name: "Default input device" };
  }
}
