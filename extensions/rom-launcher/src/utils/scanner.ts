import * as fs from "fs";
import * as path from "path";
import { Game, Library, ARCADE_SYSTEMS } from "../types";
import { Metadata } from "./metadata";

const DEEP_SCAN_SYSTEMS = [
  "PS1",
  "PS2",
  "PSP",
  "SATURN",
  "SEGA_CD",
  "DREAMCAST",
  "GAMECUBE",
  "WII",
  "PC_ENGINE_CD",
  "3DO",
  "NEOGEO_CD",
];

async function walkDir(
  dir: string,
  extensions: string[],
  maxDepth: number,
  currentDepth: number = 0,
  results: string[] = [],
): Promise<string[]> {
  if (currentDepth >= maxDepth) return results;

  try {
    const dirStream = await fs.promises.opendir(dir);

    for await (const entry of dirStream) {
      if (entry.name.startsWith(".") || entry.name.startsWith("$")) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walkDir(
          fullPath,
          extensions,
          maxDepth,
          currentDepth + 1,
          results,
        );
      } else if (extensions.includes(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    return results;
  }

  return results;
}

export async function scanLibraries(
  libraries: Library[],
  db: Metadata,
): Promise<Game[]> {
  const games: Game[] = [];

  for (const lib of libraries) {
    if (!fs.existsSync(lib.path)) continue;

    const systemDef = db.systems[lib.console];
    const extensions = systemDef?.extensions || [];

    const maxDepth = DEEP_SCAN_SYSTEMS.includes(lib.console) ? 5 : 1;

    const filePaths = await walkDir(lib.path, extensions, maxDepth);

    for (const fullPath of filePaths) {
      const rawName = path.parse(fullPath).name;
      let displayName = rawName;

      if (
        ARCADE_SYSTEMS.includes(lib.console) &&
        db.arcade_names[rawName.toLowerCase()]
      ) {
        displayName = db.arcade_names[rawName.toLowerCase()];
      }

      games.push({
        id: `${lib.id}-${path.basename(fullPath)}`,
        name: displayName,
        path: fullPath,
        console: lib.console,
        libraryId: lib.id,
        core: lib.core,
      });
    }
  }

  return games;
}
