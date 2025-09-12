import type { Toast } from "@raycast/api";
import { LocalStorage, getPreferenceValues, showToast, Toast as RayToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

// Raycast-only logger.
// - Uses Raycast Toasts when preference enabled
// - Stores structured debug events into LocalStorage under caller-provided keys
// - Routes non-error logs to console.log/warn to avoid Raycast error overlays

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  level: LogLevel;
  enableToasts: boolean;
}

export interface LogEvent {
  ts: string; // ISO
  level: LogLevel;
  component: string;
  event: string;
  msg?: string;
  data?: Record<string, unknown>;
  durationMs?: number;
  correlationId?: string;
}

const config: LoggerConfig = {
  level: "info",
  enableToasts: false,
};

// Basic sink: send error to stderr, warnings to warn, others to log
const sink: (e: LogEvent) => void = (e) => {
  const writer = e.level === "error" ? console.error : e.level === "warn" ? console.warn : console.log;
  try {
    writer(JSON.stringify(e));
  } catch {
    writer(`[log] ${e.level} ${e.component} ${e.event}`);
  }
};

export function configureFromRaycastPreferences() {
  const prefs = getPreferenceValues<{ verboseLogging?: boolean }>();
  const verbose = Boolean(prefs?.verboseLogging);
  config.level = verbose ? "debug" : "info";
  config.enableToasts = verbose;
}

function levelToNumber(l: LogLevel): number {
  switch (l) {
    case "trace":
      return 10;
    case "debug":
      return 20;
    case "info":
      return 30;
    case "warn":
      return 40;
    case "error":
      return 50;
  }
}

function shouldLog(level: LogLevel): boolean {
  return levelToNumber(level) >= levelToNumber(config.level);
}

function safeSerializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

function truncate(data: unknown, max = 10_000): unknown {
  try {
    const s = JSON.stringify(data);
    if (s.length <= max) return data as unknown;
    return { truncated: true, size: s.length, preview: s.slice(0, Math.min(max, 1_000)) };
  } catch {
    return undefined;
  }
}

function messageFromUnknown(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Simple toast rate limit to avoid spam
const toastLastShown: Record<string, number> = {};
function allowToast(key: string, windowMs = 60_000): boolean {
  const now = Date.now();
  const last = toastLastShown[key] || 0;
  if (now - last < windowMs) return false;
  toastLastShown[key] = now;
  return true;
}

export interface Logger {
  trace(event: string, msg?: string, data?: Record<string, unknown>): void;
  debug(event: string, msg?: string, data?: Record<string, unknown>): void;
  info(event: string, msg?: string, data?: Record<string, unknown>): void;
  warn(event: string, msg?: string, data?: Record<string, unknown>): void;
  error(event: string, error: unknown, data?: Record<string, unknown>): void;
  toast(key: string, title: string, message?: string, style?: Toast.Style): Promise<void>;
  withCorrelation(correlationId: string): Logger;
  newCorrelationId(prefix?: string): string;
  // Debug blob helpers
  blobSet(key: string, value: unknown): Promise<void>;
  blobMerge(key: string, patch: Record<string, unknown>): Promise<void>;
}

class BaseLogger implements Logger {
  constructor(
    private component: string,
    private correlationId?: string,
  ) {}

  private emit(level: LogLevel, event: string, msg?: string, data?: Record<string, unknown>) {
    if (!shouldLog(level)) return;
    const ev: LogEvent = {
      ts: new Date().toISOString(),
      level,
      component: this.component,
      event,
      msg,
      data: data ? (truncate(data) as Record<string, unknown>) : undefined,
      correlationId: this.correlationId,
    };
    sink(ev);
  }

  trace(event: string, msg?: string, data?: Record<string, unknown>): void {
    this.emit("trace", event, msg, data);
  }
  debug(event: string, msg?: string, data?: Record<string, unknown>): void {
    this.emit("debug", event, msg, data);
  }
  info(event: string, msg?: string, data?: Record<string, unknown>): void {
    this.emit("info", event, msg, data);
  }
  warn(event: string, msg?: string, data?: Record<string, unknown>): void {
    this.emit("warn", event, msg, data);
    // Optional toast on warn when enabled by preference
    if (config.enableToasts) {
      this.toast(`warn:${event}`, msg || "Warning", undefined, RayToast.Style.Animated).catch(() => void 0);
    }
  }
  error(event: string, error: unknown, data?: Record<string, unknown>): void {
    this.emit("error", event, undefined, { ...(data || {}), error: safeSerializeError(error) });
    // Show error toast in Raycast
    try {
      showFailureToast(error, { title: this.titleForError(event) });
    } catch {
      // Fallback toast if utils unavailable
      showToast({
        style: RayToast.Style.Failure,
        title: this.titleForError(event),
        message: messageFromUnknown(error),
      });
    }
  }

  private titleForError(event: string): string {
    return event.replace(/[:_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }

  async toast(
    key: string,
    title: string,
    message?: string,
    style: Toast.Style = RayToast.Style.Success,
  ): Promise<void> {
    if (!config.enableToasts) return;
    if (!allowToast(`${this.component}:${key}`)) return;
    await showToast({ style, title, message });
  }

  withCorrelation(correlationId: string): Logger {
    return new BaseLogger(this.component, correlationId);
  }

  newCorrelationId(prefix = "corr"): string {
    const hasUUID =
      typeof globalThis !== "undefined" &&
      typeof (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID === "function";
    const rnd = hasUUID
      ? (globalThis as { crypto: { randomUUID: () => string } }).crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${rnd}`;
  }

  async blobSet(key: string, value: unknown): Promise<void> {
    try {
      await LocalStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  async blobMerge(key: string, patch: Record<string, unknown>): Promise<void> {
    try {
      const raw = await LocalStorage.getItem<string>(key);
      const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const next = { ...base, ...patch };
      await LocalStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
}

export function getLogger(component: string): Logger {
  return new BaseLogger(component);
}
