export const POLL_DURATION_PRESETS = [
  { value: "5", title: "5 Minutes" },
  { value: "30", title: "30 Minutes" },
  { value: "60", title: "1 Hour" },
  { value: "360", title: "6 Hours" },
  { value: "720", title: "12 Hours" },
  { value: "1440", title: "1 Day" },
  { value: "4320", title: "3 Days" },
  { value: "10080", title: "7 Days" },
] as const;

export type PollDurationPreset = (typeof POLL_DURATION_PRESETS)[number]["value"] | "custom";

export function parsePollDurationMinutes(
  preset: PollDurationPreset,
  customDurationMinutes: string,
): number | undefined {
  const rawDuration = preset === "custom" ? customDurationMinutes.trim() : preset;
  if (!/^\d+$/.test(rawDuration)) return undefined;

  const durationMinutes = Number(rawDuration);
  if (!Number.isSafeInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 10_080) return undefined;
  return durationMinutes;
}
