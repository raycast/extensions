/**
 * Formats bytes into human-readable file size using SI units (KB, MB, GB, etc.)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1000;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(size < 10 ? 2 : 1)} ${units[i]}`;
}
