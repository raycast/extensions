import { mkdirSync } from "node:fs";
import { environment } from "@raycast/api";

/**
 * Ensure the extension support directory exists before any Cache or
 * LocalStorage operations run.  Raycast's framework expects this directory
 * to be present when `useCachedPromise` (which relies on `Cache`) is used,
 * but it may not exist on first launch or after a Raycast update.
 *
 * Calling `mkdirSync` with `recursive: true` is a no-op when the directory
 * already exists, so this is safe to call on every command invocation.
 */
export function ensureSupportDir(): void {
  try {
    mkdirSync(environment.supportPath, { recursive: true });
  } catch {
    // Best-effort — if this fails, the framework will surface its own error.
  }
}
