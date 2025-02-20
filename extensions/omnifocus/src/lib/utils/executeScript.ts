import { runAppleScript } from "@raycast/utils";

export async function executeScript<ReturnType = unknown>(source: string) {
  const result = await runAppleScript<ReturnType>(`(function(){${source}})()`, {
    humanReadableOutput: false,
    language: "JavaScript",
    timeout: 20_000,
  });
  return JSON.parse(result) as ReturnType;
}
