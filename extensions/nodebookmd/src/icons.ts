import { environment } from "@raycast/api";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Node icons kept on disk: Raycast draws a local file at once, and a URL one by one.
// ponytail: the cache never expires. A new Houdini build with a changed icon needs the folder emptied.
const FOLDER = join(environment.supportPath, "icons");

export function iconFile(icon: string): string {
  return join(FOLDER, icon.replaceAll("/", "_"));
}

/** Downloads the icons not on disk yet. Says whether it added any. */
export async function cacheIcons(baseUrl: string, icons: string[]): Promise<boolean> {
  const missing = [...new Set(icons)].filter((icon) => !existsSync(iconFile(icon)));
  if (missing.length === 0) return false;
  mkdirSync(FOLDER, { recursive: true });
  const saved = await Promise.all(
    missing.map(async (icon) => {
      try {
        const response = await fetch(`${baseUrl}/hicon/${icon}`);
        if (!response.ok) return false;
        writeFileSync(iconFile(icon), Buffer.from(await response.arrayBuffer()));
        return true;
      } catch {
        return false;
      }
    }),
  );
  return saved.some(Boolean);
}
