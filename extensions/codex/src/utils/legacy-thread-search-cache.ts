import { environment } from "@raycast/api";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const legacyCachePath = join(environment.supportPath, "codex-thread-search");
let cleanupPromise: Promise<void> | undefined;

export function removeLegacyThreadSearchCache(): void {
  cleanupPromise ??= rm(legacyCachePath, {
    force: true,
    recursive: true,
  }).catch(() => undefined);
}
