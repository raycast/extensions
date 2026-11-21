import { LocalStorage } from "@raycast/api";
import { existsSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

const SOUND_KEY = "ring-sound-id";

export interface RingSound {
  id: string;
  title: string;
  path: string;
}

function soundId(filename: string): string {
  return basename(filename, extname(filename)).toLowerCase().replace(/\s+/g, "-");
}

function soundTitle(filename: string): string {
  return basename(filename, extname(filename)).replace(/^Windows\s+/i, "");
}

function listFiles(directory: string, extensions: string[], pattern?: RegExp): RingSound[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((file) => extensions.includes(extname(file).toLowerCase()))
    .filter((file) => (pattern ? pattern.test(file) : true))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => ({
      id: soundId(file),
      title: soundTitle(file),
      path: join(directory, file),
    }));
}

export function listRingSounds(): RingSound[] {
  if (process.platform === "darwin") {
    return listFiles("/System/Library/Sounds", [".aiff", ".wav"]);
  }

  if (process.platform === "win32") {
    const media = join(process.env.SystemRoot || "C:\\Windows", "Media");
    return listFiles(
      media,
      [".wav"],
      /^(Alarm\d+|Ring\d+|chimes|chord|notify|tada|Windows (Ding|Notify|Notify Calendar|Notify Email|Notify Messaging|Notify System Generic|Ringin))\./i,
    );
  }

  return [];
}

export function defaultRingSound(sounds = listRingSounds()): RingSound | undefined {
  return (
    sounds.find((sound) => sound.id === "tada") ||
    sounds.find((sound) => sound.id === "glass") ||
    sounds.find((sound) => sound.id.startsWith("alarm")) ||
    sounds[0]
  );
}

export async function getSelectedRingSound(): Promise<RingSound | undefined> {
  const sounds = listRingSounds();
  const selectedId = await LocalStorage.getItem<string>(SOUND_KEY);
  return sounds.find((sound) => sound.id === selectedId) || defaultRingSound(sounds);
}

export async function setSelectedRingSound(id: string): Promise<RingSound | undefined> {
  const sound = listRingSounds().find((candidate) => candidate.id === id);
  if (!sound) {
    return undefined;
  }
  await LocalStorage.setItem(SOUND_KEY, sound.id);
  return sound;
}
