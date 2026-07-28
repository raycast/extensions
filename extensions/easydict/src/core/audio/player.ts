/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { runPowerShellScript } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { x } from "tinyexec";

import { logError, logTrace, logWarn } from "@/utils/logger";

import { playTTS } from "./tts";

interface PlayParams {
  audioPath: string;
  signal?: AbortSignal;
}

/**
 * Windows: use MCI (Media Control Interface) via winmm.dll.
 */
async function playOnWindows({ audioPath, signal }: PlayParams) {
  const safePath = audioPath.replace(/\\/g, "\\\\").replace(/"/g, '""');

  await runPowerShellScript(
    `
if (-not ([System.Management.Automation.PSTypeName]'Audio').Type) {
  Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
public class Audio {
    [DllImport("winmm.dll")]
    public static extern int mciSendString(string command, string buffer, int bufferSize, int hwndCallback);
}
'@
}
$result = [Audio]::mciSendString("play \`"${safePath}\`" wait", $null, 0, 0)
if ($result -ne 0) { throw "mciSendString failed with code $result" }
  `,
    { signal },
  );
}

/**
 * macOS: play audio file using afplay.
 */
async function playOnMac({ audioPath, signal }: PlayParams) {
  await x("/usr/bin/afplay", [audioPath], { throwOnError: true, signal });
}

/**
 * Play word audio.
 * 1. Check if file exists
 * 2. Windows: use PowerShell mciSendString
 * 3. macOS: convert WAV→M4A if needed, use afplay
 * 4. Fallback to TTS on error
 */
export async function playWordAudio(
  word: string,
  fromLanguage: string,
  options?: { audioPath?: string; signal?: AbortSignal },
): Promise<void> {
  const { audioPath, signal } = options || {};

  if (signal?.aborted) {
    logTrace("AudioPlayer", `play cancelled: ${word}`);
    return;
  }

  if (!audioPath || !fs.existsSync(audioPath)) {
    logTrace("AudioPlayer", `file not found: ${word}, fallback to TTS directly`);
    await playTTS(word, fromLanguage, { truncate: true, signal });
    return;
  }

  logTrace("AudioPlayer", `play: ${path.basename(audioPath)}`);

  try {
    if (process.platform === "win32") {
      await playOnWindows({ audioPath, signal });
      return;
    }

    if (process.platform === "darwin") {
      await playOnMac({ audioPath, signal });
      return;
    }

    logWarn("AudioPlayer", `unsupported platform: ${process.platform}`);
  } catch (err) {
    if (signal?.aborted) return;
    logError("AudioPlayer", `play file failed: ${err}, fallback to TTS`);
    await playTTS(word, fromLanguage, { truncate: true, signal });
  }
}
