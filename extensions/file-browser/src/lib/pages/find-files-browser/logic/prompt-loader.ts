/**
 * @module prompt-loader
 *
 * Loads the external AI prompt asset for the find-files search pipeline.
 * The prompt file must exist at `assets/find-files-prompt.md` within the
 * Raycast extension's assets directory.
 *
 * Missing or empty prompt files produce a visible {@link PromptAssetError} —
 * never a silent fallback.
 */

import { environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";

/** Filename of the prompt asset within the extension's assets directory. */
export const PROMPT_FILENAME = "find-files-prompt.md";

/**
 * Error thrown when the prompt asset is missing, unreadable, or empty.
 * Contains the resolved path for developer debugging.
 */
export class PromptAssetError extends Error {
  /** The file path that was attempted. */
  public readonly path: string;

  constructor(message: string, path: string) {
    super(message);
    this.name = "PromptAssetError";
    this.path = path;
  }
}

/**
 * Load the find-files AI prompt from the external asset file.
 *
 * Reads `find-files-prompt.md` from `environment.assetsPath`.
 * Throws {@link PromptAssetError} if the file is missing or empty.
 *
 * @returns The prompt text content.
 * @throws {PromptAssetError} If the file does not exist or is empty.
 */
export function loadFindFilesPrompt(): string {
  const assetPath = join(environment.assetsPath, PROMPT_FILENAME);

  let content: string;
  try {
    content = readFileSync(assetPath, "utf-8");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new PromptAssetError(`Prompt asset not found at ${assetPath}: ${reason}`, assetPath);
  }

  if (!content.trim()) {
    throw new PromptAssetError(`Prompt asset is empty at ${assetPath}`, assetPath);
  }

  return content;
}
