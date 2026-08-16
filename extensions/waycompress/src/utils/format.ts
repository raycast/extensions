import path from "path";

/**
 * Format bytes to human readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${num} ${sizes[i]}`;
}

/**
 * Format bitrate in bps to kbps or Mbps
 */
export function formatBitrate(bps: number): string {
  if (bps <= 0) return "0 kbps";
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(2)} Mbps`;
  }
  return `${Math.round(bps / 1000)} kbps`;
}

/**
 * Format seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate saved percentage and ratio
 */
export function calculateCompressionRatio(originalBytes: number, newBytes: number) {
  if (originalBytes <= 0) return { ratioPercent: 100, savedBytes: 0, savedPercent: 0 };
  const savedBytes = Math.max(0, originalBytes - newBytes);
  const savedPercent = Math.round((savedBytes / originalBytes) * 100);
  const ratioPercent = Math.round((newBytes / originalBytes) * 100);
  return {
    ratioPercent,
    savedBytes,
    savedPercent,
  };
}

/**
 * Generate output path safely handling directory paths with dots (e.g. C:\John.Doe\file.mp4)
 */
export function generateOutputPath(inputPath: string, customExt?: string): string {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const baseName = path.basename(inputPath, ext);
  const targetExt = customExt ? `.${customExt.replace(/^\./, "")}` : ext;
  return path.join(dir, `${baseName}_compressed${targetExt}`);
}
