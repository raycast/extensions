import { environment } from "@raycast/api";
import { mixer_request } from "rust:../rust";
import * as mac from "./macos-player";
import type { Mix, MixInput, SleepTimer, ToggleResult } from "./macos-player";

export * from "./macos-player";

const windows = process.platform === "win32";
type Response = { mix: Mix; count: number; cancelled: boolean };

async function request(action: Record<string, unknown>): Promise<Response> {
  return JSON.parse(await mixer_request(environment.supportPath, JSON.stringify(action)));
}

async function download(id: string) {
  const sound = mac.findSound(id);
  if (!sound) throw new Error(`Unknown sound: ${id}`);
  return mac.ensureDownloaded(sound);
}

export async function getMix(): Promise<Mix> {
  return windows ? (await request({ type: "get" })).mix : mac.getMix();
}

export async function play(id: string, volume?: number) {
  if (!windows) return mac.play(id, volume);
  const file = await download(id);
  await request({
    type: "play",
    id,
    file,
    volume: volume === undefined ? undefined : mac.clampVolume(volume),
    defaultVolume: mac.defaultVolume(),
  });
}

export async function stop(id: string) {
  if (!windows) return mac.stop(id);
  await request({ type: "stop", id });
}

export async function pause(): Promise<number> {
  return windows ? (await request({ type: "pause" })).count : mac.pause();
}

export async function resume(): Promise<number> {
  if (!windows) return mac.resume();
  const mix = await getMix();
  await Promise.all(Object.keys(mix.sounds).map(download));
  return (await request({ type: "resume" })).count;
}

export async function togglePlayback(): Promise<ToggleResult> {
  const mix = await getMix();
  if (mac.playingCount(mix) > 0) return { action: "paused", count: await pause() };
  if (Object.keys(mix.sounds).length === 0) return { action: "empty" };
  return { action: "resumed", count: await resume() };
}

export async function stopAll(): Promise<number> {
  return windows ? (await request({ type: "stopAll" })).count : mac.stopAll();
}

export async function setVolume(id: string, volume: number) {
  if (!windows) return mac.setVolume(id, volume);
  await request({ type: "volume", id, volume: mac.clampVolume(volume) });
}

export async function setMaster(volume: number) {
  if (!windows) return mac.setMaster(volume);
  await request({ type: "master", volume: mac.clampVolume(volume) });
}

export async function loadMix(sounds: MixInput, master: number, presetId?: string) {
  if (!windows) return mac.loadMix(sounds, master, presetId);
  const valid = sounds.filter((sound) => mac.findSound(sound.soundId));
  if (!valid.length) throw new Error("This mix has no playable sounds");
  const entries = await Promise.all(
    valid.map(async (sound) => ({
      id: sound.soundId,
      file: await download(sound.soundId),
      volume: mac.clampVolume(sound.volume),
    })),
  );
  await request({ type: "load", sounds: entries, master: mac.clampVolume(master), preset: presetId });
}

export async function setTimer(minutes: number): Promise<SleepTimer> {
  if (!windows) return mac.setTimer(minutes);
  const { mix } = await request({ type: "timer", minutes });
  if (!mix.timer) throw new Error("Could not start sleep timer");
  return mix.timer;
}

export async function cancelTimer(): Promise<boolean> {
  return windows ? (await request({ type: "cancelTimer" })).cancelled : mac.cancelTimer();
}
