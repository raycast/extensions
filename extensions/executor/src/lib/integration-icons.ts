import { Color, Icon, Image } from "@raycast/api";
import { parse } from "tldts";
import type { Integration } from "./types";

/** Executor's public logo service owns brand lookup and image fallbacks. */
const LOGO_PROXY = "https://integrations.sh/logo";

/** Resolve public domains with the same maintained suffix data used by Executor. */
export function registrableDomain(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const result = parse(url.hostname);
    return result.isIcann ? result.domain : null;
  } catch {
    return null;
  }
}

export function integrationLogoUrl(domain: string, size = 64): string {
  return `${LOGO_PROXY}/${encodeURIComponent(domain)}?sz=${size * 2}`;
}

/**
 * The provider logo for an integration, falling back to a neutral icon when no
 * brand domain is known. Executor itself gets the extension's own icon, matching
 * how the console renders its built-in integration.
 */
export function integrationIcon(
  slug: string,
  directory?: ReadonlyMap<string, Pick<Integration, "displayUrl"> & { kind?: string; logoDomain?: string }>,
): Image.ImageLike {
  if (slug === "executor") return { source: "extension_icon.png" };

  const integration = directory?.get(slug);
  // Executor's display URL can be a base URL, saved provider domain, or spec URL.
  // Use its domain fallback for every integration kind, just like the console.
  const domain = registrableDomain(integration?.logoDomain ?? integration?.displayUrl);
  if (!domain) return { source: Icon.Plug, tintColor: Color.SecondaryText };

  return {
    source: integrationLogoUrl(domain),
    mask: Image.Mask.RoundedRectangle,
    fallback: Icon.Plug,
  };
}
