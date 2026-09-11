export const formatSize = (bytes: number, base: 1000 | 1024 = 1024): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(base));

  return `${(bytes / base ** i).toFixed(2).replace(/\.?0+$/, "")} ${units[i]}`;
};

export const createUsageBar = (size: number, maxSize: number, length = 10): string => {
  if (!maxSize || !size) return `|${"\u3000".repeat(length)}|`;
  const filled = Math.min(Math.round((size / maxSize) * length), length);

  return `|${"\u2593".repeat(filled)}${"\u2003".repeat(length - filled)}|`;
};
