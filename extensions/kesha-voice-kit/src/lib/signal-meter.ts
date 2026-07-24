import { spawn as defaultSpawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { SILENCE_PEAK_THRESHOLD } from "./dictation-config";
import type { SignalLevel } from "./dictation-types";
import { emptySignal } from "./recording-view";
import { numberValue } from "./mic-info";
import { killProcessGroup } from "./process-tasks";

export const SWIFT_MIC_METER_SCRIPT = `
import AVFoundation
import Foundation

let engine = AVAudioEngine()
let input = engine.inputNode
let format = input.outputFormat(forBus: 0)

if format.channelCount == 0 {
  FileHandle.standardError.write(Data("No input channels\\n".utf8))
  exit(1)
}

input.installTap(onBus: 0, bufferSize: 2048, format: format) { buffer, _ in
  guard let channels = buffer.floatChannelData else { return }
  let channelCount = Int(buffer.format.channelCount)
  let frameCount = Int(buffer.frameLength)
  if channelCount == 0 || frameCount == 0 { return }

  var sum: Float = 0
  var peak: Float = 0
  var count = 0

  for channel in 0..<channelCount {
    let samples = channels[channel]
    for frame in 0..<frameCount {
      let sample = samples[frame]
      let absolute = abs(sample)
      sum += sample * sample
      peak = max(peak, absolute)
      count += 1
    }
  }

  let rms = sqrt(sum / Float(max(count, 1)))
  let percent = min(100, Int(max(sqrt(peak) * 100, rms * 600).rounded()))
  print("{\\"rms\\":\\(rms),\\"peak\\":\\(peak),\\"percent\\":\\(percent)}")
  fflush(stdout)
}

do {
  try engine.start()
  RunLoop.current.run()
} catch {
  FileHandle.standardError.write(Data("\\(error)\\n".utf8))
  exit(1)
}
`;

interface LiveMicMeterDeps {
  spawn?: typeof defaultSpawn;
  kill?: (proc: ChildProcess, signal: NodeJS.Signals) => void;
  setTimeout?: typeof setTimeout;
}

export function parseMeterLine(line: string): SignalLevel | null {
  try {
    const parsed = JSON.parse(line) as Partial<SignalLevel>;
    const rms = numberValue(parsed.rms) ?? 0;
    const peak = numberValue(parsed.peak) ?? 0;
    const percent = Math.max(0, Math.min(100, Math.round(parsed.percent ?? 0)));
    return {
      rms,
      peak,
      percent,
      state:
        peak > SILENCE_PEAK_THRESHOLD || percent > 0 ? "signal" : "listening",
      status:
        peak > SILENCE_PEAK_THRESHOLD || percent > 0
          ? "Signal detected"
          : "Listening...",
    };
  } catch {
    return null;
  }
}

export function parseMeterChunk(
  previousRemainder: string,
  chunk: string,
): { signals: SignalLevel[]; remainder: string } {
  const lines = `${previousRemainder}${chunk}`.split(/\r?\n/);
  const remainder = lines.pop() ?? "";
  return {
    remainder,
    signals: lines.flatMap((line) => {
      const signal = parseMeterLine(line);
      return signal ? [signal] : [];
    }),
  };
}

export function startLiveMicMeter(
  onSignal: (signal: SignalLevel) => void,
  deps: LiveMicMeterDeps = {},
): () => void {
  const spawn = deps.spawn ?? defaultSpawn;
  const kill = deps.kill ?? killProcessGroup;
  const schedule = deps.setTimeout ?? setTimeout;
  const proc = spawn("/usr/bin/swift", ["-e", SWIFT_MIC_METER_SCRIPT], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let stopped = false;
  let stdout = "";
  let sawSignal = false;

  proc.stdout?.on("data", (chunk: Buffer) => {
    const parsed = parseMeterChunk(stdout, chunk.toString("utf8"));
    stdout = parsed.remainder;
    for (const signal of parsed.signals) {
      sawSignal = true;
      if (!stopped) onSignal(signal);
    }
  });

  proc.once("error", () => {
    if (!stopped) onSignal(emptySignal("Meter unavailable", "unavailable"));
  });
  proc.once("exit", () => {
    if (!stopped && !sawSignal) {
      onSignal(emptySignal("Meter unavailable", "unavailable"));
    }
  });

  return () => {
    stopped = true;
    kill(proc, "SIGTERM");
    schedule(() => {
      if (proc.exitCode == null) kill(proc, "SIGKILL");
    }, 1000).unref?.();
  };
}
