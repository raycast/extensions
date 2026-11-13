// Minimal stand-in for @raycast/api so the pure logic can be unit tested with Node.
export function getPreferenceValues() {
  return { logPath: "~/Documents/DailyLog" };
}
