/** @module Logger */

/** Logs errors and warnings. */

export default class Logger {
  /**
   * Set helper variables.
   */
  constructor(logElementSelector) {
    this.logs = [];
    if (!(typeof document === "undefined")) {
      // eslint-disable-next-line no-undef
      this.logElement = document.querySelector(logElementSelector);
    }
  }

  log(level, message) {
    // Check if message is already in this.logs
    // if yes, do not log again
    if (this.logs.some((log) => log.level === level && log.message === message)) {
      return;
    }
    this.logs.push({
      level: level,
      message: message,
    });
    console.log(level, message);
    if (this.logElement) {
      this.logElement.textContent += `${message}\n`;
    }
  }
  info(message) {
    this.log("info", message);
  }
  warning(message) {
    this.log("warning", message);
    this.showLog();
  }
  success(message) {
    this.log("success", message);
  }
  error(message) {
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
