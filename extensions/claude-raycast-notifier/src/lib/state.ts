import { getPreferenceValues } from "@raycast/api";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import type { ClaudeEvent, SoundSlot } from "./event";

export type NotifierState = {
  current: ClaudeEvent | null;
  recent: ClaudeEvent[];
  sound: {
    lastPlayedAt: string | null;
    lastPlayedSoundId: string | null;
    lastSlot: SoundSlot | null;
    lastError: string | null;
  };
};

type Preferences = { stateFilePath: string };

const DEFAULT_STATE: NotifierState = {
  current: null,
  recent: [],
  sound: {
    lastPlayedAt: null,
    lastPlayedSoundId: null,
    lastSlot: null,
    lastError: null,
  },
};

export async function loadState(): Promise<NotifierState> {
  const prefs = getPreferenceValues<Preferences>();
  const path = prefs.stateFilePath.replace(/^~(?=\/)/, homedir());

  try {
    const raw = await fs.readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<NotifierState>;

    return {
      current: parsed.current ?? null,
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      sound: {
        lastPlayedAt: parsed.sound?.lastPlayedAt ?? null,
        lastPlayedSoundId: parsed.sound?.lastPlayedSoundId ?? null,
        lastSlot: parsed.sound?.lastSlot ?? null,
        lastError: parsed.sound?.lastError ?? null,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}
