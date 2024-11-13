export function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  const unitIndex = Math.floor(Math.log(size) / Math.log(1024));
  size /= Math.pow(1024, unitIndex);
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
