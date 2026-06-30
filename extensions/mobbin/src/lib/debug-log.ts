import { environment, LocalStorage } from "@raycast/api";

const DEBUG_LOG_KEY = "mobbin.debug.logs";
const MAX_LOG_ENTRIES = 120;

type DebugLogEntry = {
  timestamp: string;
  command: string;
  event: string;
  data?: Record<string, unknown>;
};

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function sanitizeData(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data) return undefined;

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (/token|verifier|secret|code$/i.test(key)) return [key, "[redacted]"];
      if (value instanceof Error)
        return [key, { name: value.name, message: value.message }];
      return [key, value];
    }),
  );
}

export async function appendDebugLog(
  event: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const sanitized = sanitizeData(data);
  const entry: DebugLogEntry = {
    timestamp: new Date().toISOString(),
    command: environment.commandName,
    event,
    ...(sanitized ? { data: sanitized } : {}),
  };

  if (environment.isDevelopment) {
    console.info(`[Mobbin] ${event}`, entry.data ?? {});
  }

  try {
    const previous = parseJson<DebugLogEntry[]>(
      await LocalStorage.getItem<string>(DEBUG_LOG_KEY),
      [],
    );
    await LocalStorage.setItem(
      DEBUG_LOG_KEY,
      JSON.stringify([...previous, entry].slice(-MAX_LOG_ENTRIES)),
    );
  } catch (error) {
    if (environment.isDevelopment) {
      console.error("[Mobbin] failed to persist debug log", error);
    }
  }
}

export async function getDebugLogText(): Promise<string> {
  const entries = parseJson<DebugLogEntry[]>(
    await LocalStorage.getItem<string>(DEBUG_LOG_KEY),
    [],
  );
  if (entries.length === 0) return "No Mobbin debug logs recorded.";

  return entries
    .map((entry) => {
      const data = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
      return `${entry.timestamp} [${entry.command}] ${entry.event}${data}`;
    })
    .join("\n");
}

export async function clearDebugLogs(): Promise<void> {
  await LocalStorage.removeItem(DEBUG_LOG_KEY);
}
