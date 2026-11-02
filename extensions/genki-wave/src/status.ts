import { homedir } from "node:os";
import { join } from "node:path";

// While the listener holds the ring, a second helper gets no replies from it,
// so the listener publishes battery and device info to a file instead.

export type WaveStatus = {
  /** Set when read from the listener's file; one-shot reads are live. */
  updatedAt?: string;
  name: string;
  firmwareVersion: string;
  boardVersion: string;
  bluetoothAddress: string;
  serialNumber: string;
  battery: { percentage: number; voltage: number; isCharging: boolean };
};

export function statusPath(env: NodeJS.ProcessEnv = process.env, home = homedir()): string {
  const base = env.XDG_STATE_HOME || join(home, ".local", "state");
  return join(base, "genki-wave", "status.json");
}

/**
 * The ring only answers queries before it enters API mode, so the listener
 * reads the battery once per connection. Readers show `updatedAt` rather than
 * discarding older readings.
 */
export function parseStatusFile(text: string): WaveStatus | undefined {
  try {
    const s = JSON.parse(text);
    if (typeof s.updatedAt !== "string" || Number.isNaN(Date.parse(s.updatedAt))) return undefined;
    if (typeof s.serialNumber !== "string" || typeof s.battery?.percentage !== "number") return undefined;
    return s as WaveStatus;
  } catch {
    return undefined;
  }
}
