type LogLevel = "debug" | "info" | "warn" | "error";

type LogExtras = Record<string, unknown> | undefined;

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { value: err };
}

function emit(level: LogLevel, event: string, extras: LogExtras, err?: unknown): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(extras ?? {}),
    ...(err !== undefined ? { error: serializeError(err) } : {}),
  };
  const serialized = JSON.stringify(line);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(serialized);
  } else {
    // eslint-disable-next-line no-console
    console.log(serialized);
  }
}

function debugEnabled(): boolean {
  return process.env.LOG_LEVEL === "debug";
}

export const logger = {
  debug(event: string, extras?: LogExtras): void {
    if (debugEnabled()) emit("debug", event, extras);
  },
  info(event: string, extras?: LogExtras): void {
    emit("info", event, extras);
  },
  warn(event: string, extras?: LogExtras): void {
    emit("warn", event, extras);
  },
  error(event: string, err: unknown, extras?: LogExtras): void {
    emit("error", event, extras, err);
  },
};

export type Logger = typeof logger;
