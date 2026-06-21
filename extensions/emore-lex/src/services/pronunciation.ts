import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
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

  try {
    await writeFile(filePath, await getAudioBuffer(audioUrl), { flag: "wx" });
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
  }

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

function isAlreadyExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
