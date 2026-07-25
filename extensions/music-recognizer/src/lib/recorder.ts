import { environment } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
import fs from "node:fs";
import path from "node:path";

export interface CaptureStats {
  capturedSec: number;
  outSamples: number;
  rms: number;
}

/** Escapes a value for a single-quoted PowerShell string literal. */
function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Path the recorder writes to. Exported so callers can delete the recording on
 * every path - including the ones where recording itself failed part way.
 */
export function captureFilePath(): string {
  return path.join(environment.supportPath, "capture.wav");
}

/**
 * Records the system's default output ("what you hear") via the bundled
 * WASAPI loopback script and returns the path of a 16 kHz mono s16le WAV.
 */
export async function recordSystemAudio(durationSeconds: number): Promise<{ wavPath: string; stats: CaptureStats }> {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  const wavPath = captureFilePath();
  const scriptPath = path.join(environment.assetsPath, "record-loopback.ps1");

  // runPowerShellScript pipes the script to `powershell.exe -Command -` via
  // stdin, where PowerShell 5.1 silently chokes on complex multi-line scripts
  // (here-strings) - exit 0, no output, nothing executed. So only this tiny
  // bootstrap goes through stdin; the real script is loaded from the asset
  // file with Invoke-Expression, which also sidesteps execution policy.
  const script = [
    `$RecorderDuration = ${Math.floor(durationSeconds)}`,
    `$RecorderOutFile = ${psQuote(wavPath)}`,
    `$RecorderRate = 16000`,
    `Invoke-Expression (Get-Content -LiteralPath ${psQuote(scriptPath)} -Raw)`,
  ].join("\n");

  // Recording itself takes durationSeconds; leave generous headroom for the
  // one-time Add-Type C# compilation (~1-2 s) and process startup.
  const stdout = await runPowerShellScript(script, {
    timeout: durationSeconds * 1000 + 25000,
    parseOutput: ({ stdout, stderr, exitCode, timedOut }) => {
      if (timedOut) throw new Error("Recording timed out.");
      if (exitCode !== 0) throw new Error(stderr.trim() || `PowerShell exited with code ${exitCode}.`);
      return stdout;
    },
  });

  const stats = parseStats(stdout);
  if (!stats) {
    throw new Error(`Recorder returned unexpected output: ${stdout.slice(0, 300)}`);
  }
  return { wavPath, stats };
}

function parseStats(stdout: string): CaptureStats | null {
  const capturedSec = stdout.match(/capturedSec=([\d.]+)/);
  const outSamples = stdout.match(/outSamples=(\d+)/);
  const rms = stdout.match(/rms=([\d.]+)/);
  if (!capturedSec || !outSamples || !rms) return null;
  return {
    capturedSec: parseFloat(capturedSec[1]),
    outSamples: parseInt(outSamples[1], 10),
    rms: parseFloat(rms[1]),
  };
}
