import { environment, LaunchType } from "@raycast/api";

/**
 * Development tracing. Prints to the `npm run dev` terminal only while the extension runs from
 * `ray develop`; silent in a Store install. The Swift helper logs separately to the unified log, live only
 * (`log show` does not keep these entries). Use the full path: zsh has a builtin named `log`.
 *   /usr/bin/log stream --level debug --predicate 'subsystem == "com.chrismessina.xdr-boost"'
 */
export function log(event: string, details?: Record<string, unknown>): void {
  if (!environment.isDevelopment) return;
  const where = `${environment.entryPointName}${environment.launchType === LaunchType.Background ? " (background)" : ""}`;
  console.log(`[xdr-boost] ${where}: ${event}`, details ?? "");
}
