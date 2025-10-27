// Utility functions for time formatting and clock emoji selection

const CLOCK_EMOJIS = [
  "🕛", // 0 / 12
  "🕐", // 1 / 13
  "🕑", // 2 / 14
  "🕒", // 3 / 15
  "🕓", // 4 / 16
  "🕔", // 5 / 17
  "🕕", // 6 / 18
  "🕖", // 7 / 19
  "🕗", // 8 / 20
  "🕘", // 9 / 21
  "🕙", // 10 / 22
  "🕚", // 11 / 23
];

export function getClockEmoji(time: string): string {
  const hour24 = parseInt(time.split(":")[0], 10);
  return CLOCK_EMOJIS[hour24 % 12];
}
