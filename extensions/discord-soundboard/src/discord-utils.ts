import fetch from "node-fetch";
import path from "node:path";
import fs from "node:fs/promises";
import audioDecode from "audio-decode";
import toWav from "audiobuffer-to-wav";
import player from "./player";
import os from "node:os";
import { withDiscordLocalStorage, makeDiscordKey } from "discord-token-decrypt";

const DISCORD_SOUNDBOARD_TEMP_DIR = path.join(os.tmpdir(), "discord-soundboard-8cAuUOdZ");

async function getDiscordSoundAsBuffer(soundId: string): Promise<ArrayBuffer> {
  const url = `https://cdn.discordapp.com/soundboard-sounds/${soundId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch sound from Discord");
  }

  return response.arrayBuffer();
}

function getDiscordSoundLocalPath(soundId: string): string {
  return path.join(DISCORD_SOUNDBOARD_TEMP_DIR, `${soundId}.wav`);
}

async function getDiscordSoundLocal(soundId: string): Promise<string | null> {
  const filePath = getDiscordSoundLocalPath(soundId);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

async function saveDiscordSound(soundId: string) {
  const buffer = await getDiscordSoundAsBuffer(soundId);
  const audioBuffer = await audioDecode(buffer);
  const wavBuffer = toWav(audioBuffer);

  await fs.mkdir(DISCORD_SOUNDBOARD_TEMP_DIR, { recursive: true }).catch(() => {});
  const filePath = getDiscordSoundLocalPath(soundId);
  await fs.writeFile(filePath, Buffer.from(wavBuffer));

  return filePath;
}

export async function playSound(soundId: string) {
  try {
    let filePath = await getDiscordSoundLocal(soundId);
    if (!filePath) {
      filePath = await saveDiscordSound(soundId);
    }

    await player.play(filePath);
  } catch (err) {
    console.error("Failed to play sound:", err);
    throw new Error("Failed to play sound");
  }
}

export async function getCurrentVoiceChannelId(): Promise<string | null> {
  try {
    const selectedChannelStore = await withDiscordLocalStorage(async (db) => {
      const data = await db.get(makeDiscordKey("SelectedChannelStore"));
      return data.slice(1);
    });

    const parsedData = JSON.parse(selectedChannelStore);
    return parsedData?.selectedVoiceChannelId || null;
  } catch {
    return null;
  }
}
