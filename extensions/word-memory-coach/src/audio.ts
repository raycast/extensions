import { getPreferenceValues, environment } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

export async function exportAudio(text: string): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const audioDir = path.join(environment.supportPath, "audio");
  await mkdir(audioDir, { recursive: true });

  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(audioDir, `study-${safeTimestamp}.aiff`);
  const args = preferences.voiceName?.trim()
    ? ["-v", preferences.voiceName.trim(), "-o", outputPath, text]
    : ["-o", outputPath, text];

  await execFileAsync("/usr/bin/say", args);
  return outputPath;
}
