export const durationTitleMap = {
  0: "Don't clear",
  15: "15 minutes",
  30: "30 minutes",
  45: "45 minutes",
  60: "1 hour",
  90: "1.5 hours",
  120: "2 hours",
  180: "3 hours",
  300: "5 hours",
};

export function getTitleForDuration(duration: number): string {
  return durationTitleMap[duration];
}
