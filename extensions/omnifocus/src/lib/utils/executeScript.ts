import { runAppleScript } from "@raycast/utils";

/**
 * Runs a JXA script. Values passed in `args` are available inside the script as `args`.
 *
 * Always pass user-provided text (task names, notes, tag, project and perspective names) through `args`
 * instead of interpolating it into `source`. The values are JSON-encoded, so backticks, quotes, backslashes
 * and `${...}` stay plain text instead of breaking the script or running as code.
 */
export async function executeScript<ReturnType = unknown>(source: string, args: Record<string, unknown> = {}) {
  const result = await runAppleScript<ReturnType>(`(function(){const args = ${JSON.stringify(args)};${source}})()`, {
    humanReadableOutput: false,
    language: "JavaScript",
    timeout: 20_000,
  });
  return JSON.parse(result) as ReturnType;
}
