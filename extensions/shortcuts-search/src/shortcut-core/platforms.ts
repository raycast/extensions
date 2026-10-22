// Generated from shared/shortcuts-core; run scripts/sync-shortcuts-core.mjs --write.
import type { Platform } from "./types";
export function supportsPlatform(platforms: readonly string[] | undefined, platform: Platform): boolean {
  return platforms === undefined || platforms.includes(platform);
}
