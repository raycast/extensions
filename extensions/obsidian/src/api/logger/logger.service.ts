export class Logger {
  private readonly name: string;

  // ANSI escape codes for colors
  private static readonly COLORS = {
    reset: "\x1b[0m",
    info: "\x1b[34m", // Blue
    success: "\x1b[32m", // Green
    warning: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
    debug: "\x1b[35m", // Magenta
    trace: "\x1b[90m", // Gray
    timestamp: "\x1b[90m", // Gray for timestamp
    name: "\x1b[36m", // Cyan for logger name
  };

  constructor(name?: string) {
    this.name = name || "Logger";
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(message: unknown): string {
    if (typeof message === "string") {
      return message;
    }

    if (message instanceof Error) {
      return `${message.message}\n${message.stack}`;
    }

    if (typeof message === "object" && message !== null) {
      try {
        return JSON.stringify(message, null, 2);
      } catch (e) {
        return String(message);
      }
    }

    return String(message);
  }

  private log(level: string, color: string, message: unknown): void {
    const formattedTimestamp = `${Logger.COLORS.timestamp}[${this.timestamp()}]${Logger.COLORS.reset}`;
    const formattedName = `${Logger.COLORS.name}[${this.name}]${Logger.COLORS.reset}`;
    const formattedLevel = `${color}[${level.toUpperCase()}]${Logger.COLORS.reset}`;
    const formattedMessage = this.formatMessage(message);

    console.log(`${formattedTimestamp} ${formattedName} ${formattedLevel} ${formattedMessage}`);
    // console.log(`${color}${formattedTimestamp} ${formattedName} ${formattedLevel} ${formattedMessage}${Logger.COLORS.reset}`);
  }

  info(message: unknown): void {
    this.log("info", Logger.COLORS.info, message);
  }

  success(message: unknown): void {
    this.log("success", Logger.COLORS.success, message);
  }

  warning(message: unknown): void {
    this.log("warning", Logger.COLORS.warning, message);
  }

  error(message: unknown): void {
    this.log("error", Logger.COLORS.error, message);
  }

  debug(message: unknown): void {
    this.log("debug", Logger.COLORS.debug, message);
  }

  trace(message: unknown): void {
    this.log("trace", Logger.COLORS.trace, message);
  }
}
