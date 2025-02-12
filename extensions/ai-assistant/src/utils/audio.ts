import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Mute or unmute system audio output
 * @param mute Whether to mute (true) or unmute (false) the audio
 * @returns Promise<void>
 */
export async function setSystemAudioMute(mute: boolean): Promise<void> {
  try {
    const command = `osascript -e 'set volume ${mute ? "with" : "without"} output muted'`;
    await execAsync(command);
  } catch (error) {
    console.error("Error setting system audio mute:", error);
  }
}

/**
 * Get current system audio mute state
 * @returns Promise<boolean> True if system audio is muted, false otherwise
 */
export async function isSystemAudioMuted(): Promise<boolean> {
  try {
    const command = `osascript -e 'output muted of (get volume settings)'`;
    const { stdout } = await execAsync(command);
    return stdout.trim() === "true";
  } catch (error) {
    console.error("Error getting system audio mute state:", error);
    return false;
  }
}
