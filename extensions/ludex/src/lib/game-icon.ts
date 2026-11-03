import { Icon, Image } from "@raycast/api";
import { pathToFileURL } from "url";
import type { GameWithPaths } from "./types";

export function gameIcon(game: GameWithPaths): Image.ImageLike {
  const file = game.iconPath;
  if (!file) return Icon.GameController;
  if (/\.exe$/i.test(file)) return { fileIcon: file };
  return {
    source: pathToFileURL(file).href,
    mask: Image.Mask.RoundedRectangle,
    fallback: Icon.GameController,
  };
}
