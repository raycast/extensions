export function parseBytes(value: string | number | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatBytes(value: string | number | undefined): string {
  const bytes = parseBytes(value);
  if (bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const scaled = bytes / Math.pow(1024, exponent);
  return `${scaled.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatSpeed(value: string | number | undefined): string {
  const bytes = parseBytes(value);
  if (bytes <= 0) return "0 B/s";
  return `${formatBytes(bytes)}/s`;
}

export function formatPercent(
  completed: string | number | undefined,
  total: string | number | undefined,
): number {
  const completedBytes = parseBytes(completed);
  const totalBytes = parseBytes(total);
  if (totalBytes <= 0) return 0;
  return Math.min(100, Math.max(0, (completedBytes / totalBytes) * 100));
}

export function formatEta(
  total: string | number | undefined,
  completed: string | number | undefined,
  speed: string | number | undefined,
): string {
  const totalBytes = parseBytes(total);
  const completedBytes = parseBytes(completed);
  const remaining = totalBytes - completedBytes;
  const bytesPerSecond = parseBytes(speed);
  if (totalBytes <= 0) return "waiting";
  if (remaining <= 0) return "done";
  if (bytesPerSecond <= 0) return "unknown";
  const seconds = Math.ceil(remaining / bytesPerSecond);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

const ERROR_LABELS: Record<string, string> = {
  "0": "OK",
  "1": "Unknown error",
  "2": "Timeout",
  "3": "Resource not found",
  "4": "Too many not-found errors",
  "5": "Aborted: speed too slow",
  "6": "Network problem",
  "7": "Unfinished downloads",
  "8": "Server does not support resume",
  "9": "Not enough disk space",
  "10": "Piece length changed",
  "11": "Same file is already downloading",
  "12": "Same torrent is already downloading",
  "13": "File already exists",
  "14": "Rename failed",
  "15": "Cannot open existing file",
  "16": "Cannot create file",
  "17": "File I/O error",
  "18": "Cannot create directory",
  "19": "Name resolution failed",
  "20": "Metalink parse failed",
  "21": "FTP command failed",
  "22": "HTTP response error",
  "23": "Too many redirects",
  "24": "HTTP authorization failed",
  "25": "Torrent parse failed",
  "26": "Torrent file corrupted",
  "27": "Magnet URI bad",
  "28": "Bad aria2 option",
  "29": "Server overloaded",
  "30": "RPC request parse failed",
  "32": "Checksum failed",
};

export function formatErrorCode(code: string | number | undefined): string {
  const key = String(code ?? "0");
  return ERROR_LABELS[key] ?? `aria2 error ${key}`;
}

export function getFileNameFromPath(filePath: string | undefined): string {
  if (!filePath) return "";
  const normalized = filePath.replace(/[\\/]+$/, "");
  const parts = normalized.split(/[\\/]/);
  return parts[parts.length - 1] || normalized;
}

export function formatLimit(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "0";
}
