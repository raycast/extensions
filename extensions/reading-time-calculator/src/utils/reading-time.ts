/**
 * Calculates reading time based on word count and reading speed
 * @param wordCount Number of words in the text
 * @param wpm Words per minute reading speed
 * @returns Formatted string representing the reading time
 */
export function calculateReadingTime(wordCount: number, wpm: number): string {
  if (wordCount < 0 || wpm <= 0 || !Number.isFinite(wordCount) || !Number.isFinite(wpm)) {
    return "0 seconds";
  }
  if (wordCount === 0) return "0 seconds";

  // Calculate reading time in seconds
  const timeInSeconds = (wordCount / wpm) * 60;

  // Format the time
  if (timeInSeconds < 60) {
    // Less than a minute
    return `${Math.round(timeInSeconds)} second${Math.round(timeInSeconds) !== 1 ? "s" : ""}`;
  } else {
    // More than a minute
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.round(timeInSeconds % 60);

    if (seconds === 0) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }

    return `${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
}
