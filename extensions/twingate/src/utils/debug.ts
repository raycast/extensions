interface DebugLogEntry {
  timestamp: number;
  level: "debug" | "info" | "error";
  message: string;
  data?: unknown;
}

export class DebugLogger {
  private static logs: DebugLogEntry[] = [];
  private static isDebugMode = false; // Always start disabled

  static async initializeDebugMode(): Promise<void> {
    // Always start with debug mode disabled - don't read from storage
    this.isDebugMode = false;
    this.info("Debug logger initialized", { debugMode: this.isDebugMode });
  }

  static async toggleDebugMode(): Promise<boolean> {
    this.isDebugMode = !this.isDebugMode;
    // Don't persist debug mode to storage - it should always start disabled

    if (this.isDebugMode) {
      this.info("Debug mode enabled");
    } else {
      this.info("Debug mode disabled");
    }

    return this.isDebugMode;
  }

  static debug(message: string, data?: unknown): void {
    this.log("debug", message, data);
  }

  static info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  static error(message: string, data?: unknown): void {
    this.log("error", message, data);
  }

  private static log(
    level: "debug" | "info" | "error",
    message: string,
    data?: unknown,
  ): void {
    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only last 500 logs
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500);
    }

    // Only console log if debug mode is enabled
    if (this.isDebugMode) {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      console.log(
        `[${timestamp}] [${level.toUpperCase()}] ${message}`,
        data || "",
      );
    }
  }

  static exportLogs(): string {
    const logLines = this.logs.map((log) => {
      const timestamp = new Date(log.timestamp).toISOString();
      const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : "";
      return `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}${dataStr}`;
    });

    return logLines.join("\n");
  }

  static clearLogs(): void {
    this.logs = [];
  }

  static getDebugStats(): { logCount: number; isDebugMode: boolean } {
    return {
      logCount: this.logs.length,
      isDebugMode: this.isDebugMode,
    };
  }
}
