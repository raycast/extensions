export class Logger {
  private readonly name: string;

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

  info(message: unknown): void {
    console.log(`[${this.timestamp()}] [${this.name}] [INFO] ${this.formatMessage(message)}`);
  }

  success(message: unknown): void {
    console.log(`[${this.timestamp()}] [${this.name}] [SUCCESS] ${this.formatMessage(message)}`);
  }

  warning(message: unknown): void {
    console.log(`[${this.timestamp()}] [${this.name}] [WARNING] ${this.formatMessage(message)}`);
  }

  error(message: unknown): void {
    console.log(`[${this.timestamp()}] [${this.name}] [ERROR] ${this.formatMessage(message)}`);
  }

  debug(message: unknown): void {
    console.log(`[${this.timestamp()}] [${this.name}] [DEBUG] ${this.formatMessage(message)}`);
  }

  trace(message: unknown): void {
    console.log(`[${this.timestamp()}] [${this.name}] [TRACE] ${this.formatMessage(message)}`);
  }
}
