import { environment, Icon, Image } from "@raycast/api";
import { existsSync } from "node:fs";
import { Bot } from "./core/client";
import { resolveCharacterImage } from "./core/characters";

/** User-local character artwork is optional and is never bundled for redistribution. */
export function botIcon(bot: Bot): Image.ImageLike {
  const result = resolveCharacterImage(
    bot,
    environment.supportPath,
    existsSync,
  );
  return result.source
    ? { source: result.source }
    : { source: Icon.Person, tintColor: result.color };
}
