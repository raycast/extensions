import { environment } from "@raycast/api";
import * as fs from "node:fs";

export const LOG_FILE = `${environment.supportPath}/oauth-debug.log`;

export function log(msg: string) {
  if (!environment.isDevelopment) return;
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.mkdirSync(environment.supportPath, { recursive: true });
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // ignore
  }
  console.log(msg);
}
