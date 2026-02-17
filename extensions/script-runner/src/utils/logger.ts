import fs from "fs";
import path from "path";
import os from "os";

// Simple logger implementation that writes to a file in the user's home directory
// or a specific log directory if needed.
// Raycast extensions usually log to console, but for debugging these scripts
// running in VM, a file log is helpful.

const LOG_FILE_PATH = path.join(os.homedir(), ".iterm-tabs-extension.log");

export const logger = {
  log: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [INFO] ${message} ${args.map((a) => JSON.stringify(a)).join(" ")}\n`;
    console.log(message, ...args);
    try {
      fs.appendFileSync(LOG_FILE_PATH, formattedMessage);
    } catch (e) {
      // ignore logging errors
    }
  },
  error: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [ERROR] ${message} ${args.map((a) => JSON.stringify(a)).join(" ")}\n`;
    console.error(message, ...args);
    try {
      fs.appendFileSync(LOG_FILE_PATH, formattedMessage);
    } catch (e) {
      // ignore logging errors
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [WARN] ${message} ${args.map((a) => JSON.stringify(a)).join(" ")}\n`;
    console.warn(message, ...args);
    try {
      fs.appendFileSync(LOG_FILE_PATH, formattedMessage);
    } catch (e) {
      // ignore logging errors
    }
  },
};
