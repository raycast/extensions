import { accessSync, constants } from "fs";
import type { ToolStatus } from "./types";

const MAS_PATHS = ["/opt/homebrew/bin/mas", "/usr/local/bin/mas"];
const BREW_PATHS = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];

function isExecutable(paths: string[]): boolean {
  for (const p of paths) {
    try {
      accessSync(p, constants.X_OK);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

export function getToolStatus(): ToolStatus {
  return {
    brew: isExecutable(BREW_PATHS),
    mas: isExecutable(MAS_PATHS),
  };
}
