import { basename, dirname } from "node:path";
import { environment } from "@raycast/api";
import type { ScriptArgument, ScriptCommand } from "./types";

/**
 * Raycast reads a Script Command's metadata from comment lines anywhere near the top of the file,
 * regardless of the language's comment marker (`#`, `//`, `--`, …). Matching on the `@raycast.` token
 * alone rather than on a leading marker is what keeps this working across shell, Node, Python, Swift
 * and AppleScript without a per-language table.
 */
const METADATA_PATTERN = /@raycast\.([A-Za-z][A-Za-z0-9]*)\s*(.*)$/;

export const HEADER_SCAN_LINES = 100;

const ARGUMENT_KEYS = ["argument1", "argument2", "argument3"] as const;

const parseBoolean = (value: string | undefined) => value?.trim().toLowerCase() === "true";

const parseArgument = (raw: string | undefined): ScriptArgument | undefined => {
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as ScriptArgument;
  } catch {
    return { placeholder: raw };
  }
};

const readMetadata = (body: string) => {
  const metadata: Record<string, string> = {};

  for (const line of body.split("\n").slice(0, HEADER_SCAN_LINES)) {
    const match = line.match(METADATA_PATTERN);
    if (!match) continue;

    const [, key, value] = match;
    if (metadata[key] === undefined) metadata[key] = value.trim();
  }

  return metadata;
};

const stripExtension = (filename: string) => filename.replace(/\.[^.]+$/, "");

/**
 * Slug algorithm transcribed from the shipped Raycast 2 backend bundle.
 * The extension slug and the command slug both go through it (`"Script Commands"` → `script-commands`).
 *
 * NFD → strip combining marks → lowercase → trim
 *   → remove [^a-z0-9 -] → collapse whitespace to "-" → collapse repeated "-"
 *
 * Note it **deletes** disallowed characters rather than treating them as separators,
 * so `github.com` becomes `githubcom`, not `github-com`.
 */
export const slugify = (input: string): string => {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export type ParseInput = {
  path: string;
  body: string;
  isExecutable: boolean;
};

/**
 * The deeplink identifier is the filename without its extension — NOT a slug of `@raycast.title`.
 * Verified against working links in the wild: a script named `flux-quit.sh` titled "Quit Flux" is
 * reached at `raycast://script-commands/flux-quit`, never `quit-flux`. Deriving it from the title
 * produces links that silently fail to resolve.
 *
 * @deprecated This was true for Raycast 1. Raycast 2 moved Script Commands to an internal extension
 * addressed as `raycast://extensions/raycast/script-commands/<title-slug>`, where the slug is
 * derived from the title via the algorithm in `slugify()`. This file now emits a version-aware
 * deeplink that works on both versions.
 */
export const parseScriptCommand = ({ path, body, isExecutable }: ParseInput): ScriptCommand | undefined => {
  const metadata = readMetadata(body);
  if (!metadata.schemaVersion) return undefined;

  const filename = basename(path);
  const deeplinkId = stripExtension(filename);
  const title = metadata.title || deeplinkId;
  const titleSlug = slugify(title);

  const argumentsList = ARGUMENT_KEYS.map((key) => parseArgument(metadata[key])).filter(
    (argument): argument is ScriptArgument => argument !== undefined,
  );

  // Raycast 1: raycast://script-commands/<deeplinkId>
  // Raycast 2: raycast://extensions/raycast/script-commands/<titleSlug>
  // Detect version at parse time; emitting both URLs causes double-execution on versions where both resolve.
  const isRaycast2 = environment.raycastVersion.startsWith("2.");
  const deeplink = isRaycast2
    ? `raycast://extensions/raycast/script-commands/${encodeURIComponent(titleSlug)}`
    : `raycast://script-commands/${encodeURIComponent(deeplinkId)}`;

  return {
    path,
    directory: dirname(path),
    filename,
    deeplinkId,
    titleSlug,
    deeplink,
    body,
    isExecutable,
    schemaVersion: metadata.schemaVersion,
    title,
    mode: metadata.mode,
    packageName: metadata.packageName,
    icon: metadata.icon,
    iconDark: metadata.iconDark,
    currentDirectoryPath: metadata.currentDirectoryPath,
    needsConfirmation: metadata.needsConfirmation ? parseBoolean(metadata.needsConfirmation) : undefined,
    refreshTime: metadata.refreshTime,
    author: metadata.author,
    authorURL: metadata.authorURL,
    description: metadata.description,
    argumentsList,
  };
};
