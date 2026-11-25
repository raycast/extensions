import { PremiereExtension } from "../types";

const VALID_EXTENSIONS = new Set<string>(["prproj"]);

export function isValidPremiereExtension(ext: string): ext is PremiereExtension {
  return VALID_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, ""));
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(date: Date | undefined): string {
  if (!date || isNaN(date.getTime())) return "Unknown";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    month: "short",
    day: "numeric",
  });
}

export function calculateAspectRatio(width: number, height: number): string | undefined {
  if (!width || !height || width <= 0 || height <= 0) return undefined;

  const ratio = width / height;

  if (Math.abs(ratio - 16 / 9) < 0.02) return "16:9 (Landscape)";
  if (Math.abs(ratio - 9 / 16) < 0.02) return "9:16 (Vertical / Reels)";
  if (Math.abs(ratio - 1) < 0.02) return "1:1 (Square)";
  if (Math.abs(ratio - 4 / 3) < 0.02) return "4:3 (Classic)";
  if (Math.abs(ratio - 21 / 9) < 0.05 || Math.abs(ratio - 2.388) < 0.05) return "21:9 (Ultrawide)";

  const gcd = (a: number, b: number): number => {
    let x = Math.round(a);
    let y = Math.round(b);
    while (y) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x;
  };

  const divisor = gcd(width, height);
  const ratioW = Math.round(width / divisor);
  const ratioH = Math.round(height / divisor);

  return `${ratioW}:${ratioH}`;
}
