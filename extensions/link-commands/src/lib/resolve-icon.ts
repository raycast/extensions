import { Icon, type Image } from "@raycast/api";
import { isAbsolute, join } from "node:path";
import { expandHome } from "./home-path";
import type { ScriptCommand } from "./types";

const FILE_PATH_PATTERN = /\.(png|jpe?g|gif|svg|webp|pdf|icns)$/i;

const isRaycastIconName = (value: string): value is keyof typeof Icon => value in Icon;

/**
 * Whether `@raycast.icon` is naming a file kept beside the script, as opposed to the three other things
 * that field accepts. Exported so nothing else has to re-derive it: the four cases are told apart only by
 * the order they are tested in, and a second copy of that order elsewhere is a copy that drifts.
 */
export const isRelativeIconFile = (raw: string | undefined) => {
  const value = raw?.trim();
  if (!value) return false;

  if (/^https?:\/\//i.test(value)) return false;
  if (isRaycastIconName(value)) return false;
  if (isAbsolute(value) || value.startsWith("~")) return false;

  return FILE_PATH_PATTERN.test(value);
};

/**
 * `@raycast.icon` accepts four unrelated things — a remote URL, a built-in Raycast icon name, a file
 * path relative to the script, or a bare emoji — with no marker distinguishing them. Order matters
 * here: emoji is the fallback rather than a case, because there is no reliable test for "is an emoji"
 * that does not also swallow single-character icon names.
 */
export const resolveIcon = (command: ScriptCommand): Image.ImageLike => {
  const raw = command.icon?.trim();
  if (!raw) return Icon.Terminal;

  if (/^https?:\/\//i.test(raw)) return { source: raw };

  if (isRaycastIconName(raw)) return Icon[raw];

  if (isAbsolute(raw) || raw.startsWith("~")) return { source: expandHome(raw) };

  if (FILE_PATH_PATTERN.test(raw)) return { source: join(command.directory, raw) };

  return raw;
};
