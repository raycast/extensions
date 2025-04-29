// src/utils/hsPath.ts
import { existsSync } from "fs";

export function getHsPath(): string {
  if (existsSync("/opt/homebrew/bin/hs")) return "/opt/homebrew/bin/hs";
  if (existsSync("/usr/local/bin/hs")) return "/usr/local/bin/hs";
  throw new Error("Hammerspoon CLI not found in /opt/homebrew/bin or /usr/local/bin.");
}
