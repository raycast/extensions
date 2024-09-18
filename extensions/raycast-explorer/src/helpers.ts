import { Icon, environment } from "@raycast/api";

export const CONTRIBUTE_URL = "https://github.com/raycast/ray-so";

export function wrapInCodeBlock(text: string, language = "sh") {
  const backticks = "```";
  return `${backticks}${language}\n${text}\n${backticks}`;
}

export const raycastProtocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";

export const getIcon = (icon: string) => {
  return icon
    .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    .replace(/^./, (str) => str.toUpperCase()) as keyof typeof Icon;
};
