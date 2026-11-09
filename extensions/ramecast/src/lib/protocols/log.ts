import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

export const CAST_LOG = path.join(environment.supportPath, "cast.log");

/**
 * Protocol trace in cast.log, for diagnosing device issues. `fresh` starts a new log (use when
 * casting); stop/cleanup appends so the trace of a failed cast survives.
 */
export function protocolLog(protocol: string, fresh = true): (line: string) => void {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  if (fresh) fs.writeFileSync(CAST_LOG, "");
  return (line) => fs.appendFileSync(CAST_LOG, `${new Date().toISOString()} [${protocol}] ${line}\n`);
}
