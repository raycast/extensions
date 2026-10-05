import { execa } from "execa";
import { getSwitchAudioPath } from "./deps";

export async function getCurrentAudioSource(): Promise<string> {
  const switchAudioPath = getSwitchAudioPath();
  if (!switchAudioPath) {
    throw new Error("SwitchAudioSource not found");
  }
  const { stdout } = await execa(switchAudioPath, ["-c"]);
  return stdout.trim();
}

export async function setAudioSource(name: string): Promise<void> {
  const switchAudioPath = getSwitchAudioPath();
  if (!switchAudioPath) {
    throw new Error("SwitchAudioSource not found");
  }
  await execa(switchAudioPath, ["-s", name]);
}

/**
 * Aggressively prevent audio from switching by rapid checking and reverting
 * Uses very short intervals to make any switch imperceptible
 */
export async function watchAndRevertAudio(
  originalSource: string,
  durationMs = 6000,
  checkIntervalMs = 100, // Much faster checks
) {
  const startTime = Date.now();
  let revertCount = 0;

  while (Date.now() - startTime < durationMs) {
    await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));

    try {
      const current = await getCurrentAudioSource();
      if (current !== originalSource) {
        console.log(
          `Audio changed to ${current}, reverting to ${originalSource} (attempt ${revertCount + 1})`,
        );
        await setAudioSource(originalSource);
        revertCount++;

        // After first revert, do several rapid re-sets to ensure it sticks
        if (revertCount === 1) {
          for (let i = 0; i < 3; i++) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            await setAudioSource(originalSource);
          }
        }
      }
    } catch (e) {
      console.error("Error checking audio source", e);
    }
  }

  if (revertCount > 0) {
    console.log(`Audio reverted ${revertCount} time(s)`);
  } else {
    console.log("Audio did not change during watch period");
  }

  return revertCount > 0;
}

/**
 * Force audio to stay on original source by setting it multiple times
 * during the critical connection window
 */
export async function forceAudioLock(originalSource: string, lockMs = 2000) {
  console.log(`Force-locking audio to ${originalSource}`);

  // Set audio multiple times in rapid succession
  for (let i = 0; i < 10; i++) {
    try {
      await setAudioSource(originalSource);
      await new Promise((resolve) => setTimeout(resolve, lockMs / 10));
    } catch (e) {
      console.error("Error in force lock:", e);
    }
  }
}
