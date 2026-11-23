export interface BrowserProcessIdentity {
  pid: number;
  launchedAt: number;
}

export function parseBrowserProcess(value: unknown): BrowserProcessIdentity | undefined {
  if (!value || typeof value !== "object") return undefined;
  const process = value as Partial<BrowserProcessIdentity>;
  if (typeof process.pid !== "number" || !Number.isSafeInteger(process.pid) || process.pid <= 0) return undefined;
  if (typeof process.launchedAt !== "number" || !Number.isFinite(process.launchedAt) || process.launchedAt <= 0)
    return undefined;
  return { pid: process.pid, launchedAt: process.launchedAt };
}

export function sameBrowserProcess(a?: BrowserProcessIdentity, b?: BrowserProcessIdentity): boolean {
  return Boolean(a && b && a.pid === b.pid && a.launchedAt === b.launchedAt);
}
