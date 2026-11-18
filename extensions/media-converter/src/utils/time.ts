/**
 * Parse a user-provided time string into seconds.
 *
 * Accepted formats:
 *   - "SS" or "SS.mmm" (e.g. "90", "12.5")
 *   - "MM:SS[.mmm]" (e.g. "1:30", "01:30.250")
 *   - "HH:MM:SS[.mmm]" (e.g. "00:01:30")
 *
 * Returns null for invalid input (including empty/whitespace).
 */
export function parseTimeString(input: string | undefined | null): number | null {
  if (input === undefined || input === null) return null;
  const trimmed = String(input).trim();
  if (trimmed.length === 0) return null;

  const parts = trimmed.split(":");
  if (parts.length > 3) return null;

  const nums = parts.map((p) => (p === "" ? NaN : Number(p)));
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;

  let seconds: number;
  if (nums.length === 1) {
    seconds = nums[0];
  } else if (nums.length === 2) {
    if (nums[1] >= 60) return null;
    seconds = nums[0] * 60 + nums[1];
  } else {
    if (nums[1] >= 60 || nums[2] >= 60) return null;
    seconds = nums[0] * 3600 + nums[1] * 60 + nums[2];
  }

  return Number.isFinite(seconds) ? seconds : null;
}

/**
 * Format a number of seconds as "H:MM:SS" or "M:SS" if under an hour.
 */
export function formatTimeString(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return "0:00";
  const sec = Math.floor(totalSec % 60);
  const min = Math.floor((totalSec / 60) % 60);
  const hr = Math.floor(totalSec / 3600);
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return hr > 0 ? `${hr}:${pad2(min)}:${pad2(sec)}` : `${min}:${pad2(sec)}`;
}

/**
 * Format as FFmpeg-compatible "HH:MM:SS.mmm" for use with -ss / -to.
 */
export function toFfmpegTime(totalSec: number): string {
  const clamped = Math.max(0, totalSec);
  const hr = Math.floor(clamped / 3600);
  const min = Math.floor((clamped / 60) % 60);
  const sec = clamped - hr * 3600 - min * 60;
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return `${pad2(hr)}:${pad2(min)}:${sec.toFixed(3).padStart(6, "0")}`;
}
