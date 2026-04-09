import { access } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  defaultRootDir,
  notifierPaths,
  readSoundLibrary,
  readSoundMappings,
} from "./sound-config.mjs";

const execFileAsync = promisify(execFile);

export async function resolveSoundForEvent(event, { rootDir = defaultRootDir() } = {}) {
  const slot = event?.soundSlot ?? event?.type ?? "running";
  const hookKey = typeof event?.hookKey === "string" ? event.hookKey : null;
  const mappings = await readSoundMappings(rootDir);
  const library = await readSoundLibrary(rootDir);
  const mapping = (hookKey ? mappings.hooks?.[hookKey] : null) ?? mappings.slots?.[slot] ?? null;

  if (!mapping) {
    return { slot, hookKey, soundId: null, filePath: null, reason: "unmapped" };
  }

  if (!mapping.enabled) {
    return { slot, hookKey, soundId: mapping.soundId ?? null, filePath: null, reason: "disabled" };
  }

  if (!mapping.soundId) {
    return { slot, hookKey, soundId: null, filePath: null, reason: "unmapped" };
  }

  const sound = library.sounds.find((entry) => entry.id === mapping.soundId);
  if (!sound?.filename) {
    return { slot, hookKey, soundId: mapping.soundId, filePath: null, reason: "missing_sound" };
  }

  const filePath = join(notifierPaths(rootDir).soundsDir, sound.filename);

  try {
    await access(filePath);
  } catch {
    return { slot, hookKey, soundId: sound.id, filePath: null, reason: "missing_file" };
  }

  return { slot, hookKey, soundId: sound.id, filePath, reason: null };
}

export async function previewSound(filePath) {
  await execFileAsync("afplay", [filePath]);
}

export async function playSoundForEvent(event, options = {}) {
  const playback = await resolveSoundForEvent(event, options);

  if (!playback.filePath) {
    return {
      ...playback,
      played: false,
      playedAt: null,
      error: null,
    };
  }

  try {
    await previewSound(playback.filePath);
    return {
      ...playback,
      played: true,
      playedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    return {
      ...playback,
      played: false,
      playedAt: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
