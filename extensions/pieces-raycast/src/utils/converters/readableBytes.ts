/**
 * Converts a given number of bytes into a human-readable string with appropriate units.
 *
 * @param {number} bytes - The number of bytes to be converted.
 * @returns {string} A string representing the number of bytes in a human-readable format with units.
 */
export default function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
