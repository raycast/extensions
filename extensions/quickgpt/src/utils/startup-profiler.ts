const startedAtMs = Number(process.hrtime.bigint()) / 1_000_000;
const isTest = process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;

export function startupNowMs(): number {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

export function startupElapsedMs(sinceMs: number = startedAtMs): number {
  return Number((startupNowMs() - sinceMs).toFixed(1));
}

function stringifyDetails(details?: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) {
    return "";
  }

  try {
    return ` ${JSON.stringify(details)}`;
  } catch {
    return " [unserializable details]";
  }
}

export function startupLog(message: string, details?: Record<string, unknown>): void {
  if (isTest) {
    return;
  }

  console.log(`[QuickGPT startup +${startupElapsedMs()}ms] ${message}${stringifyDetails(details)}`);
}

export function startupWarn(message: string, details?: Record<string, unknown>): void {
  if (isTest) {
    return;
  }

  console.warn(`[QuickGPT startup +${startupElapsedMs()}ms] ${message}${stringifyDetails(details)}`);
}

export function measureStartup<T>(message: string, fn: () => T, details?: Record<string, unknown>): T {
  const started = startupNowMs();
  try {
    const result = fn();
    startupLog(message, { ...details, durationMs: startupElapsedMs(started) });
    return result;
  } catch (error) {
    startupWarn(`${message} failed`, {
      ...details,
      durationMs: startupElapsedMs(started),
      error: String(error),
    });
    throw error;
  }
}
