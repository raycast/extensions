import { runPowerShellScript } from "@raycast/utils";

/**
 * Escapes a value for safe embedding as a single-quoted PowerShell argument.
 * Internal single quotes are doubled to prevent injection.
 */
export function escapePowerShellArg(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Runs a PowerShell script string via @raycast/utils runPowerShellScript.
 * Callers must pre-escape any user-controlled values with escapePowerShellArg.
 */
export async function runPowerShell(script: string): Promise<string> {
  return runPowerShellScript(script);
}
