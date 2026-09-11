import { Color, Icon, Image } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { accountCacheKey, listIntegrations } from "./client";
import { integrationName } from "./format";
import type { Integration } from "./types";

/**
 * Executor's web console renders provider logos through this proxy, so using it
 * here means the extension shows exactly the same artwork as the console. The
 * proxy owns its own fallbacks: unknown domains come back as a generated letter
 * placeholder rather than an error, and clients never resolve favicons against a
 * third party directly.
 */
const LOGO_PROXY = "https://integrations.sh/logo";

/**
 * Brand domains for the logo proxy.
 *
 * An integration's `displayUrl` points at the API it talks to rather than the
 * product's own site, and is frequently the wrong brand: Resend's OpenAPI spec
 * is served from `raw.githubusercontent.com`, and every Google integration
 * reports `www.googleapis.com`. Both resolve to the proxy's placeholder, and the
 * GitHub one would put GitHub's mark on Resend. Mapping the brand domain
 * explicitly avoids that; `displayUrl` is only the fallback for an integration
 * that is not listed here.
 */
const INTEGRATION_DOMAINS: Record<string, string> = {
  brandfetch: "brandfetch.com",
  cloudflare: "cloudflare.com",
  github: "github.com",
  google_calendar: "calendar.google.com",
  google_docs: "docs.google.com",
  google_drive: "drive.google.com",
  google_gmail: "gmail.com",
  google_sheets: "sheets.google.com",
  linear: "linear.app",
  miro: "miro.com",
  notion: "notion.so",
  paypal: "paypal.com",
  postman: "postman.com",
  railway: "railway.com",
  resend: "resend.com",
  slack: "slack.com",
  splitwise: "splitwise.com",
  spotify: "spotify.com",
  supabase: "supabase.com",
  svgl: "svgl.app",
  vercel: "vercel.com",
  wise: "wise.com",
  wispr_flow: "wisprflow.ai",
  youtube: "youtube.com",
};

/** Public suffixes with two labels, so the registrable domain keeps three. */
const COMPOUND_SUFFIXES = new Set([
  "co.jp",
  "co.nz",
  "co.uk",
  "com.au",
  "com.br",
  "com.mx",
  "com.sg",
  "net.au",
  "org.uk",
]);

/**
 * The registrable domain of a URL, e.g. `mcp.cloudflare.com` becomes
 * `cloudflare.com`. The console uses `tldts` for this; a full public suffix list
 * is more than this needs, so the handful of two-label suffixes above is enough.
 */
export function registrableDomain(url: string | null | undefined): string | null {
  if (!url) return null;

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    host = url
      .trim()
      .replace(/^https?:\/\//i, "")
      .split("/")[0];
  }

  host = host.toLowerCase().replace(/^www\./, "");
  const labels = host.split(".").filter((label) => label.length > 0);
  if (labels.length < 2) return null;

  const lastTwo = labels.slice(-2).join(".");
  if (COMPOUND_SUFFIXES.has(lastTwo) && labels.length >= 3) return labels.slice(-3).join(".");
  return lastTwo;
}

export function integrationLogoUrl(domain: string, size = 64): string {
  return `${LOGO_PROXY}/${encodeURIComponent(domain)}?sz=${size * 2}`;
}

/** Slug to `Integration`, so a view can look up a name or URL in one place. */
export type IntegrationDirectory = Map<string, Integration>;

/**
 * The provider logo for an integration, falling back to a neutral icon when no
 * brand domain is known. Executor itself gets the extension's own icon, matching
 * how the console renders its built-in integration.
 */
export function integrationIcon(
  slug: string,
  directory?: ReadonlyMap<string, Pick<Integration, "displayUrl">>,
): Image.ImageLike {
  if (slug === "executor") return { source: "extension_icon.png" };

  const domain = INTEGRATION_DOMAINS[slug.toLowerCase()] ?? registrableDomain(directory?.get(slug)?.displayUrl);
  if (!domain) return { source: Icon.Plug, tintColor: Color.SecondaryText };

  return {
    source: integrationLogoUrl(domain),
    mask: Image.Mask.RoundedRectangle,
    fallback: Icon.Plug,
  };
}

/**
 * Executor's own display name for an integration, e.g. `google_gmail` renders as
 * `Gmail`. Falls back to the local brand map until the directory resolves, so
 * the first paint is never a raw slug.
 */
export function integrationLabel(slug: string, directory?: IntegrationDirectory): string {
  return directory?.get(slug)?.name ?? integrationName(slug);
}

/**
 * Loads the integration directory. Cached, because it is a small response that
 * every view wants and it changes only when an integration is added or removed.
 */
export function useIntegrationDirectory(): IntegrationDirectory {
  const { data } = useCachedPromise(
    async (_scope: string) => {
      void _scope;
      return listIntegrations();
    },
    [accountCacheKey()],
    {
      initialData: [] as Integration[],
      failureToastOptions: { title: "Could Not Load Integrations" },
    },
  );

  return useMemo(() => new Map((data ?? []).map((integration) => [integration.slug, integration])), [data]);
}
