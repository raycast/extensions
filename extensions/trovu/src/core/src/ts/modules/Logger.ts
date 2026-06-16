/** @module Logger */

/** Logs errors and warnings. */

export default class Logger {
  logs: Array<{ level: string; message: string }>;
  logElement: HTMLElement | null;
  consoleLevels: string[];

  /**
   * Set helper variables.
   */
  constructor(logElementSelector: string = "", options: { consoleLevels?: string[] } = {}) {
    this.logs = [];
    this.logElement = null;
    this.consoleLevels = options.consoleLevels || ["warning", "error"];
    if (!(typeof document === "undefined") && logElementSelector) {
      this.logElement = document.querySelector(logElementSelector) as HTMLElement | null;
    }
  }

  setConsoleLevels(levels: string[]) {
    this.consoleLevels = levels;
  }

  writeToConsole(level: string, message: string) {
    if (!this.consoleLevels.includes(level)) {
      return;
    }
    const consoleMethodByLevel: Record<string, "info" | "log" | "warn" | "error"> = {
      info: "info",
      success: "log",
      warning: "warn",
      error: "error",
    };
    const consoleMethod = consoleMethodByLevel[level] || "log";
    console[consoleMethod](message);
  }

  log(level: string, message: string) {
    // Check if message is already in this.logs
    // if yes, do not log again
    if (this.logs.some((log) => log.level === level && log.message === message)) {
      return;
    }
    this.logs.push({
      level: level,
      message: message,
    });
    this.writeToConsole(level, message);
    if (this.logElement) {
      this.logElement.textContent += `${message}\n`;
    }
  }
  info(message: string) {
    this.log("info", message);
  }
  warning(message: string) {
    this.log("warning", message);
    this.showLog();
  }
  success(message: string) {
    this.log("success", message);
  }
  error(message: string) {
    this.log("error", message);
    this.showLog();
    throw new Error(message);
  }
  showLog() {
    if (this.logElement) {
      this.logElement.removeAttribute("hidden");
    }
  }
}
