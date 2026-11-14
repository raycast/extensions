import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { BUNDLE_ID } from "./devtools";
import bundledTools from "./tools.json";

export interface Tool {
  id: string;
  name: string;
  category: string;
  keywords: string[];
}

/** Where DevTools 2.1+ writes its tool list on each launch (Tauri's app data folder). */
export function manifestPath(): string {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? path.join(homedir(), "AppData", "Roaming"), BUNDLE_ID, "tools.json");
  }
  return path.join(homedir(), "Library", "Application Support", BUNDLE_ID, "tools.json");
}

const isTool = (value: unknown): value is Tool => {
  const tool = value as Tool;
  return (
    typeof tool?.id === "string" &&
    typeof tool.name === "string" &&
    typeof tool.category === "string" &&
    Array.isArray(tool.keywords)
  );
};

/**
 * Reads the installed app's tool list, so new tools appear without an extension update and the
 * list matches the installed version. Falls back to the list bundled with the extension.
 */
export async function loadTools(): Promise<{ tools: Tool[]; fromApp: boolean }> {
  try {
    const manifest = JSON.parse(await readFile(manifestPath(), "utf8"));
    if (manifest?.version === 1 && Array.isArray(manifest.tools) && manifest.tools.every(isTool)) {
      return { tools: manifest.tools, fromApp: true };
    }
  } catch {
    // No list yet: DevTools 2.0 or earlier, or the app has not been opened since it was installed.
  }
  return { tools: bundledTools, fromApp: false };
}
