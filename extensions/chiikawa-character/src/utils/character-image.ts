import { environment } from "@raycast/api";
import { accessSync, constants, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ChiikawaCharacter } from "../types/character";

export function getCharacterImage(character: ChiikawaCharacter, animated: boolean): string | undefined {
  const sources = animated
    ? [path.join(environment.assetsPath, "animated", `${character.id}.svg`), character.icon]
    : [character.icon];

  for (const source of sources) {
    if (!source) continue;
    try {
      accessSync(source, constants.R_OK);
      if (statSync(source).isFile()) return pathToFileURL(source).href;
    } catch {
      // Missing artwork falls back to the original portrait, then a text-only profile.
    }
  }
  return undefined;
}
