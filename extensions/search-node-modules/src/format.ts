export function formatSize(kilobytes: number): string {
  const units = ["KB", "MB", "GB", "TB"];
  let size = kilobytes;
  let unitIndex = 1;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(0)} ${units[unitIndex]}`;
}
