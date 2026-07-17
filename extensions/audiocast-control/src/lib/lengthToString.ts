/**
 * Converts a length in milliseconds to a string in the format "MM:SS".
 * @param length The length in milliseconds.
 * @returns The length as a string in the format "MM:SS".
 */
export function lengthToString(length: number): string {
  if (typeof length !== "number" || isNaN(length)) {
    return "";
  }

  const minutes = Math.floor(length / 60000);
  const seconds = Math.floor((length % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}
