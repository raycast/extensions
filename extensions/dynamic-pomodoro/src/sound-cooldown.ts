const LAST_COMPLETION_SOUND_AT_KEY = "timer-last-completion-sound-at-v1";

declare function require(name: "@raycast/api"): typeof import("@raycast/api");

function toFiniteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isCompletionSoundCooldownActive({
  now,
  lastPlayedAt,
  cooldownMs,
}: {
  now: number;
  lastPlayedAt: number | undefined;
  cooldownMs: number;
}): boolean {
  if (!Number.isFinite(cooldownMs) || cooldownMs <= 0) {
    return false;
  }

  if (lastPlayedAt === undefined) {
    return false;
  }

  return now - lastPlayedAt < cooldownMs;
}

export async function getLastCompletionSoundAt(): Promise<number | undefined> {
  try {
    const { LocalStorage } = require("@raycast/api");
    const raw = await LocalStorage.getItem<string>(LAST_COMPLETION_SOUND_AT_KEY);
    return toFiniteNumber(raw);
  } catch {
    return undefined;
  }
}

export async function setLastCompletionSoundAt(timestamp: number): Promise<void> {
  try {
    const { LocalStorage } = require("@raycast/api");
    await LocalStorage.setItem(LAST_COMPLETION_SOUND_AT_KEY, String(timestamp));
  } catch {
    // Cooldown marker should never break timer flow.
  }
}
