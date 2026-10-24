import { LocalStorage } from "@raycast/api";
import { resolveVariant } from "@mcdays/cloudflare-images-core";
import type { CfImagesPreferences } from "./config.js";

/**
 * Raycast-side variant wiring. The actual resolution logic lives in
 * `@mcdays/cloudflare-images-core` (see `resolveVariant`), so MCP / CLI
 * surfaces can reuse the same priority rules. This module only does the
 * Raycast-specific glue: reading from LocalStorage and exposing
 * persistence helpers used by the `Set Default Variant` command.
 *
 * See `CONTEXT.md > Default Variant` for the full priority order.
 */

const STORAGE_KEY = "default-variant";

/**
 * Compute the effective Default Variant for this invocation.
 *
 * @param prefs    The surface preferences (carries the `defaultVariant`
 *                 textfield value).
 * @param override Optional per-invocation Variant Override. When non-empty,
 *                 wins over LocalStorage and preferences. Pass `null` /
 *                 `undefined` for "no override".
 */
export async function getEffectiveDefaultVariant(
  prefs: CfImagesPreferences,
  override?: string | null,
): Promise<string> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  return resolveVariant({
    override,
    stored,
    preference: prefs.defaultVariant,
  });
}

export async function getStoredDefaultVariant(): Promise<string | null> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  return stored && stored.trim() ? stored : null;
}

/**
 * Persists a Variant choice. Pass with leading `/` (e.g. `/public`).
 */
export async function setStoredDefaultVariant(variant: string): Promise<void> {
  const normalised = variant.startsWith("/") ? variant : `/${variant}`;
  await LocalStorage.setItem(STORAGE_KEY, normalised);
}

export async function clearStoredDefaultVariant(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
