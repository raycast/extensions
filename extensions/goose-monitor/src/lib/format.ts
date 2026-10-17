/* 展示格式化：列表里紧凑，tooltip 给精确值。 */

const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

/** CPU 一位小数 + %。 */
export const fmtCpu = (cpu: number): string => `${(Number.isFinite(cpu) ? cpu : 0).toFixed(1)}%`;

/** 0–1 占比取整百分比，iStat 环心那种 34%。 */
export const fmtPctInt = (ratio: number | undefined): string => {
  if (ratio === undefined || !Number.isFinite(ratio)) return "—";
  return `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
};

/** 紧凑内存：<1GB 取整 MB（100 MB），否则一位小数 GB。 */
export const fmtMem = (bytes: number): string =>
  bytes >= GIB ? `${(bytes / GIB).toFixed(1)} GB` : `${Math.round(bytes / MIB)} MB`;

/** 菜单栏分解：0 显示 0 KB，不到 1 MB 走 KB。 */
export const fmtMemParts = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < MIB) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < GIB) return `${Math.round(bytes / MIB)} MB`;
  return `${(bytes / GIB).toFixed(1)} GB`;
};

/** tooltip 用精确值。 */
export const memExact = (bytes: number): string => `${Math.round(bytes).toLocaleString("en-US")} B`;
export const cpuExact = (cpu: number): string => `${(Number.isFinite(cpu) ? cpu : 0).toFixed(2)}%`;

/** 速率：没有采样值（网络分类关 / 该行无流量）返回 —。 */
export const fmtRate = (bytesPerSecond: number | undefined): string => {
  if (bytesPerSecond === undefined || !Number.isFinite(bytesPerSecond) || bytesPerSecond < 0) return "—";
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
  if (bytesPerSecond < MIB) return `${(bytesPerSecond / 1024).toFixed(bytesPerSecond < 10 * 1024 ? 1 : 0)} KB/s`;
  return `${(bytesPerSecond / MIB).toFixed(bytesPerSecond < 10 * MIB ? 1 : 0)} MB/s`;
};

export const fmtPorts = (ports: number[] | undefined, max = 3): string => {
  if (!ports || ports.length === 0) return "";
  if (ports.length <= max) return ports.join(" ");
  return `${ports.slice(0, max).join(" ")} +${ports.length - max}`;
};
