import { environment } from "@raycast/api";

export const CONTRIBUTE_URL = "https://github.com/raycast/extensions/edit/main/extensions/raycast-explorer";

export function wrapInCodeBlock(text: string, language = "sh") {
  const backticks = "```";
  return `${backticks}${language}\n${text}\n${backticks}`;
}

export const raycastProtocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
