import { environment } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Node icons kept on disk: Raycast draws a local file at once, and a URL one by one.
// A third of the icons the index names are not in the install. Asking for them each time
// is what made those rows wait, so their names are kept too.
// ponytail: the cache never expires. A new Houdini build with a changed icon needs the folder emptied.
const FOLDER = join(environment.supportPath, "icons");
const MISSING_FILE = join(environment.supportPath, "missing-icons.json");

function readMissing(): Set<string> {
  try {
    return new Set(JSON.parse(readFileSync(MISSING_FILE, "utf8")) as string[]);
  } catch {
    return new Set();
  }
}

const missing = readMissing();

function iconFile(icon: string): string {
  return join(FOLDER, icon.replaceAll("/", "_"));
}

/** The icon file on disk, or undefined while it is not there (missing, or not downloaded yet). */
export function cachedIcon(icon: string): string | undefined {
  if (missing.has(icon)) return undefined;
  const file = iconFile(icon);
  return existsSync(file) ? file : undefined;
}

/** Downloads the icons not seen before, all at once. Says whether it learned anything new. */
export async function cacheIcons(baseUrl: string, icons: string[]): Promise<boolean> {
  const unknown = [...new Set(icons)].filter((icon) => !missing.has(icon) && !existsSync(iconFile(icon)));
  if (unknown.length === 0) return false;
  mkdirSync(FOLDER, { recursive: true });
  const learned = await Promise.all(
    unknown.map(async (icon) => {
      try {
        const response = await fetch(`${baseUrl}/hicon/${icon}`);
        if (response.status === 404) {
          missing.add(icon);
          return true;
        }
        if (!response.ok) return false;
        writeFileSync(iconFile(icon), Buffer.from(await response.arrayBuffer()));
        return true;
      } catch {
        return false;
      }
    }),
  );
  writeFileSync(MISSING_FILE, JSON.stringify([...missing]));
  return learned.some(Boolean);
}
