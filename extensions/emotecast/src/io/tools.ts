import { accessSync, constants } from "node:fs";

export type ToolId = "ffmpeg" | "magick";

const CANDIDATES: Record<ToolId, string[]> = {
  ffmpeg: [
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
  ],
  magick: [
    "/opt/homebrew/bin/magick",
    "/usr/local/bin/magick",
    "/opt/local/bin/magick",
  ],
};

export const INSTALL_COMMAND: Record<ToolId, string> = {
  ffmpeg: "brew install ffmpeg",
  magick: "brew install imagemagick",
};

export class ToolMissingError extends Error {
  readonly tool: ToolId;

  constructor(tool: ToolId) {
    super(`${tool} is required to prepare this emote`);
    this.tool = tool;
  }
}

export function resolveTool(
  tool: ToolId,
  preferred?: string,
): string | undefined {
  const candidates = preferred?.trim()
    ? [preferred.trim(), ...CANDIDATES[tool]]
    : CANDIDATES[tool];

  return candidates.find((path) => {
    try {
      accessSync(path, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}
