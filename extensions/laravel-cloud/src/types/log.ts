export interface LogEntry {
  message: string;
  level: LogLevel;
  type: LogType;
  logged_at: string;
  data: AccessLogData | ApplicationLogData | ExceptionLogData | Record<string, unknown> | null;
}

export type LogLevel = "info" | "warning" | "error" | "debug";
export type LogType = "access" | "application" | "exception" | "system";

export interface AccessLogData {
  status: number;
  method: string;
  path: string;
  duration_ms: number | null;
  bytes_sent: number | null;
  ip: string | null;
  user_agent: string | null;
  country: string | null;
}

export interface ApplicationLogData {
  channel: string | null;
  context: Record<string, unknown> | null;
  extra: Record<string, unknown> | null;
}

export interface ExceptionLogData {
  class: string | null;
  code: number | null;
  file: string | null;
  trace: string[] | null;
}

export interface LogsResponse {
  data: LogEntry[];
  meta: {
    cursor: string;
    type: string;
    from: string;
    to: string;
  };
}
