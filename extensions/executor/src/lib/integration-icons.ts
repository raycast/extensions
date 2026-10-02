import { Color, Icon, Image } from "@raycast/api";
import { parse } from "tldts";
import type { Integration } from "./types";
import presets from "./integration-artwork.json";

export type IntegrationIconMetadata = Pick<Integration, "displayUrl"> & {
  kind?: string;
  /** null means the server metadata identifies only a specification host. */
  logoDomain?: string | null;
};

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

export function normalizedIntegrationUrl(value: string | null | undefined): string | undefined {
  if (!value || !registrableDomain(value)) return undefined;
  try {
    const url = new URL(value);
    url.hash = "";
    url.searchParams.sort();
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function googleService(value: string): string | undefined {
  const url = new URL(value);
  const segments = url.pathname.split("/").filter(Boolean);
  if (url.hostname === "www.googleapis.com") {
    return segments[0] === "discovery" && segments[2] === "apis" ? segments[3] : segments[0];
  }
  return url.hostname.endsWith(".googleapis.com") ? url.hostname.slice(0, -".googleapis.com".length) : undefined;
}

/** Match upstream preset URLs, never user-editable names or integration slugs. */
export function integrationPresetIcon(integration: IntegrationIconMetadata): string | undefined {
  const url = normalizedIntegrationUrl(integration.displayUrl);
  if (!url) return undefined;
  const service = integration.kind === "openapi" ? googleService(url) : undefined;
  return presets.artwork.find((preset) => {
    if (preset.kind !== integration.kind) return false;
    return (
      normalizedIntegrationUrl(preset.url) === url || (service !== undefined && googleService(preset.url) === service)
    );
  })?.icon;
}

/**
 * The provider logo for an integration, falling back to a neutral icon when no
 * brand domain is known. Executor itself gets the extension's own icon, matching
 * how the console renders its built-in integration.
 */
export function integrationIcon(
  slug: string,
  directory?: ReadonlyMap<string, IntegrationIconMetadata>,
): Image.ImageLike {
  if (slug === "executor") return { source: "extension_icon.png" };

  const integration = directory?.get(slug);
  const domain = registrableDomain(
    integration?.logoDomain !== undefined
      ? integration.logoDomain
      : integration?.kind === "openapi"
        ? undefined
        : integration?.displayUrl,
  );
  const source =
    (integration?.logoDomain && domain ? integrationLogoUrl(domain) : undefined) ??
    (integration ? integrationPresetIcon(integration) : undefined) ??
    (domain ? integrationLogoUrl(domain) : undefined);
  if (!source) return { source: Icon.Plug, tintColor: Color.SecondaryText };

  return {
    source,
    mask: Image.Mask.RoundedRectangle,
    fallback: Icon.Plug,
  };
}
