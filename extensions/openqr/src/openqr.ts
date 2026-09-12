import { existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPreferenceValues } from "@raycast/api";
import { OpenQR, OpenQRError } from "@open-qr/sdk";

/** A single SDK client built from the Raycast `apiKey` preference. */
export function client(): OpenQR {
  const { apiKey } = getPreferenceValues<Preferences>();
  return new OpenQR({ apiKey: apiKey.trim() });
}

/** Turn any thrown value into a human-readable message for a Raycast Toast. */
export function errorMessage(e: unknown): string {
  if (e instanceof OpenQRError) {
    if (e.code === "unauthorized")
      return "Invalid API key — set a valid oqr_… key in extension preferences.";
    if (e.code === "rate_limited") return "Rate limited — try again shortly.";
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

/** Filesystem-safe stem derived from arbitrary payload text. */
export function safeName(data: string): string {
  const base =
    data
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "qr";
  return base.toLowerCase();
}

/**
 * Deterministic temp path keyed by every input that affects the pixels.
 *
 * `safeName` alone is not enough: two different payloads can normalise to the same stem
 * ("a b" and "a-b"), and the same payload at a different size or colour is a different image.
 * Either case would overwrite the other's file and display a QR encoding the wrong thing.
 */
export function qrTempPath(stem: string, ext: string, key: unknown): string {
  const hash = createHash("sha1")
    .update(JSON.stringify(key))
    .digest("hex")
    .slice(0, 10);
  return join(tmpdir(), `openqr-${stem}-${hash}.${ext}`);
}

/**
 * Render `data` as a PNG into a temp file and return the absolute path.
 *
 * Shared by the generator and the dynamic-code commands: a dynamic code exists to be printed,
 * so handing back only the short URL leaves you without the artefact you actually needed.
 */
export async function renderQrPng(
  data: string,
  opts: { size?: number; theme?: string; name?: string } = {},
): Promise<string> {
  const size = opts.size ?? 512;
  // Cached on disk: browsing a list re-selects the same codes constantly, and a QR for a given
  // short URL never changes, so re-rendering would be pure API traffic.
  const path = qrTempPath(opts.name ?? safeName(data), "png", {
    data,
    size,
    theme: opts.theme ?? null,
  });
  if (existsSync(path)) return path;

  const bytes = await client().generate({
    data,
    format: "png",
    size,
    theme: opts.theme,
  });
  writeFileSync(path, bytes);
  return path;
}
