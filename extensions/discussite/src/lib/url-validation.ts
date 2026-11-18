/**
 * Lightweight URL validation for the Raycast extension.
 *
 * Full validation (TLD checks, NSFW blocking, punycode, private networks)
 * is enforced server-side. This module only handles basic input normalization
 * and HTTPS enforcement for good client-side UX.
 *
 * Inlined to keep the Raycast extension self-contained for store review.
 */

const INVALID_URL_ERROR = "That doesn't look like a valid URL.";
const HTTPS_ONLY_ERROR =
  "Only secure HTTPS sites can be posted. Remove http:// or use the HTTPS version.";

export type NormalizeSiteUrlInputResult =
  | { ok: true; normalizedUrl: string }
  | { ok: false; error: string };

export function normalizeSiteUrlInput(value = ""): NormalizeSiteUrlInputResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a URL." };
  }

  if (/^http:\/\//i.test(trimmed)) {
    return { ok: false, error: HTTPS_ONLY_ERROR };
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https:\/\//i.test(trimmed)) {
    return { ok: false, error: HTTPS_ONLY_ERROR };
  }

  const candidate = /^https:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") {
      return { ok: false, error: HTTPS_ONLY_ERROR };
    }
    return { ok: true, normalizedUrl: parsed.toString() };
  } catch {
    return { ok: false, error: INVALID_URL_ERROR };
  }
}
