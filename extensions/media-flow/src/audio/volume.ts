import { runAppleScript } from "../lib/applescript";

/** Current system output volume (0–100), or null on failure. */
export async function getSystemVolume(): Promise<number | null> {
  const out = await runAppleScript("output volume of (get volume settings)");
  if (out === null) return null;
  const n = Number(out);
  return Number.isFinite(n) ? n : null;
}

/** Set system output volume, clamped to 0–100. Rejects non-finite input. Returns false on failure. */
export async function setSystemVolume(v: number): Promise<boolean> {
  if (!Number.isFinite(v)) return false;
  const clamped = Math.min(100, Math.max(0, Math.round(v)));
  const out = await runAppleScript(`set volume output volume ${clamped}`);
  return out !== null;
}
