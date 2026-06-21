import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function playPronunciation(audioUrl: string): Promise<void> {
  const cachedPath = await cacheAudio(audioUrl);
  await playAudioFile(cachedPath);
}

async function cacheAudio(audioUrl: string): Promise<string> {
  const audioDirectory = join(environment.supportPath, "audio");
  await mkdir(audioDirectory, { recursive: true });

  const extension = audioUrl.split("?")[0]?.split(".").pop() ?? "mp3";
  const fileName = `${createHash("sha1").update(audioUrl).digest("hex")}.${extension}`;
  const filePath = join(audioDirectory, fileName);

  if (await isUsableFile(filePath)) {
    return filePath;
  }

  const audioBuffer = await getAudioBuffer(audioUrl);
  if (audioBuffer.length === 0) {
    throw new Error("Downloaded pronunciation audio is empty");
  }

  const temporaryPath = join(audioDirectory, `${fileName}.${process.pid}.${Date.now()}.tmp`);
  await writeFile(temporaryPath, audioBuffer, { flag: "wx" });
  await rename(temporaryPath, filePath).catch(async (error) => {
    await unlink(temporaryPath).catch(() => undefined);
    if (!(await isUsableFile(filePath))) throw error;
  });

  return filePath;
}

async function getAudioBuffer(audioUrl: string): Promise<Buffer> {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to download pronunciation audio: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function playAudioFile(filePath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const player = spawn("/usr/bin/afplay", [filePath], { stdio: "ignore" });
    player.on("error", reject);
    player.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Audio playback failed with exit code ${code ?? "unknown"}`));
      }
    });
  });
}

async function isUsableFile(filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile() && fileStat.size > 0;
  } catch {
    return false;
  }
}
