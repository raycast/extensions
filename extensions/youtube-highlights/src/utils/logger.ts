import { environment } from "@raycast/api";

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private context: string;
  private isEnabled: boolean;

  constructor(context: string) {
    this.context = context;
    this.isEnabled = environment.isDevelopment || process.env.ENABLE_LOGS === "true";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private log(_level: LogLevel, _message: string, _data?: unknown) {}

  debug(message: string, data?: unknown) {
    this.log("debug", message, data);
  }

  info(message: string, data?: unknown) {
    this.log("info", message, data);
  }

  warn(message: string, data?: unknown) {
    this.log("warn", message, data);
  }

  error(message: string, error?: unknown) {
    if (error instanceof Error) {
      this.log("error", message, { message: error.message, stack: error.stack });
    } else {
      this.log("error", message, error);
    }
  }
}

export const createLogger = (context: string) => new Logger(context);
