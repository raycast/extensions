import { getPreferenceValues } from "@raycast/api";
import type {
  CloudflareConfig,
  CompressionConfig,
} from "@mcdays/cloudflare-images-core";

/**
 * The preference shape comes from `raycast-env.d.ts`, which Raycast
 * auto-generates from the manifest's `preferences` array on every `ray
 * develop` / `ray build`. Repo convention is to consume that generated
 * `Preferences` type directly instead of duplicating it by hand, so that
 * a manifest change can't silently drift from a hand-written interface.
 */
export type CfImagesPreferences = Preferences;

/**
 * Default metadata template, identical to the manifest's `default` value. Used
 * as a fallback when the user clears the textfield OR when their custom value
 * fails JSON.parse.
 */
export const DEFAULT_METADATA_TEMPLATE: Record<string, string> = {
  uploadedBy: "Raycast Extension: Cloudflare Images",
  uploadedAt: "${timestamp}",
  fileName: "${fileName}",
  extensionVersion: "${surfaceVersion}",
};

/**
 * Reads the user's Raycast preferences and returns them as a strongly-typed
 * object. Numeric textfields are parsed to numbers and clamped to sensible
 * ranges; missing optional values fall back to defaults that match the
 * `package.json` manifest.
 */
export function getPreferences(): CfImagesPreferences {
  const raw = getPreferenceValues<Preferences>();
  return {
    ...raw,
    defaultVariant: raw.defaultVariant?.trim() || "/public",
  };
}

/**
 * Builds a `CloudflareConfig` (the core's auth + URL-shape struct) from
 * Raycast preferences. The `signingKey` field starts empty, the surface
 * is expected to populate it lazily from cache or by calling
 * `fetchSigningKey()` when an actual signed-URL upload happens.
 *
 * `defaultVariantOverride` lets the caller supply a Variant resolved via
 * the `lib/variant.ts` precedence chain (override → stored → preference →
 * /public). When omitted, the textfield value flows straight through.
 *
 * `useSignedUrlsOverride` lets the caller supply the Effective Signed Mode
 * resolved via `resolveSignedMode(prefs.useSignedUrls, opts.signed)`. When
 * omitted, the preference value flows straight through. Pass this to honour
 * per-invocation Overrides from commands like `Upload Clipboard as Signed
 * Image` or `Upload Clipboard as Public Image`.
 */
export function buildCloudflareConfig(
  prefs: CfImagesPreferences,
  signingKey = "",
  defaultVariantOverride?: string,
  useSignedUrlsOverride?: boolean,
): CloudflareConfig {
  return {
    accountId: prefs.accountId.trim(),
    apiToken: prefs.apiToken.trim(),
    accountHash: prefs.accountHash.trim(),
    defaultVariant: defaultVariantOverride ?? prefs.defaultVariant,
    useSignedUrls: useSignedUrlsOverride ?? prefs.useSignedUrls,
    signingKey,
    signedUrlExpiration: clampNonNegativeInt(prefs.signedUrlExpiration, 0),
  };
}

/**
 * Builds a `CompressionConfig` for the core's `compressImageIfNeeded` from
 * Raycast preferences.
 */
export function buildCompressionConfig(
  prefs: CfImagesPreferences,
): CompressionConfig {
  return {
    enableCompression: prefs.enableCompression,
    maxFileSizeMB: clampPositiveInt(prefs.maxFileSizeMB, 10),
    compressionQuality: clampRange(prefs.compressionQuality, 1, 100, 80),
    preservePngFormat: prefs.preservePngFormat,
  };
}

/**
 * Parses the `metadataTemplate` textfield preference into a Record<string,string>
 * suitable for passing to `core.uploadImage()`'s `metadataTemplate` argument.
 *
 * Behaviour:
 *   - Empty / whitespace input → returns the default template.
 *   - Valid JSON object whose values are all strings → returns it as-is.
 *   - Valid JSON object with non-string values → coerced to strings via `String(v)`.
 *   - Invalid JSON OR not an object → returns the default + `parseError: true`
 *     so the caller can show a quiet toast warning. Falling back instead of
 *     hard-failing keeps the upload flow working even if the user is in
 *     the middle of editing their template.
 */
export interface ParsedMetadataTemplate {
  template: Record<string, string>;
  parseError: boolean;
  errorMessage?: string;
}

export function parseMetadataTemplate(
  raw: string | undefined,
): ParsedMetadataTemplate {
  if (!raw || !raw.trim()) {
    return { template: DEFAULT_METADATA_TEMPLATE, parseError: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      template: DEFAULT_METADATA_TEMPLATE,
      parseError: true,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      template: DEFAULT_METADATA_TEMPLATE,
      parseError: true,
      errorMessage:
        'Metadata template must be a JSON object (e.g. {"key":"value"}).',
    };
  }

  const template: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    template[k] = typeof v === "string" ? v : String(v);
  }
  return { template, parseError: false };
}

function clampNonNegativeInt(input: string, fallback: number): number {
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function clampPositiveInt(input: string, fallback: number): number {
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clampRange(
  input: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
