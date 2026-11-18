export function bytesPerSecond(deltaBytes: number, elapsedMs: number): number {
  if (elapsedMs <= 0 || deltaBytes <= 0) {
    return 0;
  }

  return deltaBytes / (elapsedMs / 1000);
}
