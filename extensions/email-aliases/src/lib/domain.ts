import { parse } from "tldts";

/**
 * How much of the hostname ends up in the alias.
 * Numeric values count labels **on top of the public suffix**, so `1` turns
 * `account.bvg.de` into `bvg.de` and `www.amazon.co.uk` into `amazon.co.uk`
 * instead of the wrong `co.uk` a naive "last two labels" split would produce.
 * `auto` decides per hostname, see {@link autoLabel}.
 */
export type DomainDepth = "auto" | "1" | "2" | "3" | "4" | "full" | "name";

export const DOMAIN_DEPTH_OPTIONS: { value: DomainDepth; title: string }[] = [
  { value: "auto", title: "Automatic — keeps a subdomain only when it means something" },
  { value: "1", title: "Domain + suffix — example.com" },
  { value: "2", title: "One level more — shop.example.com" },
  { value: "3", title: "Two levels more — eu.shop.example.com" },
  { value: "4", title: "Three levels more" },
  { value: "full", title: "Full hostname" },
  { value: "name", title: "Name only, without suffix — example" },
];

export function isDomainDepth(value: string): value is DomainDepth {
  return DOMAIN_DEPTH_OPTIONS.some((option) => option.value === value);
}

/** Accepts a full URL, a bare hostname or something pasted by hand. */
export function extractHost(input: string): string | undefined {
  const raw = input.trim();
  if (!raw) return undefined;

  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
  try {
    const hostname = new URL(withScheme).hostname;
    return hostname ? hostname.replace(/\.$/, "").toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Subdomains that say nothing about *who* the service is. They are the ones
 * single sign-on, infrastructure and content sections hide behind, so the
 * automatic mode drops them.
 */
const GENERIC_SUBDOMAINS = new Set([
  // entry points
  "www",
  "www1",
  "www2",
  "www3",
  "web",
  "m",
  "mobile",
  "wap",
  "app",
  "apps",
  "portal",
  "start",
  "home",
  // sign-in and identity
  "login",
  "logon",
  "signin",
  "sign-in",
  "signup",
  "sign-up",
  "register",
  "anmeldung",
  "auth",
  "auth0",
  "sso",
  "saml",
  "oauth",
  "oidc",
  "idp",
  "sts",
  "adfs",
  "id",
  "ids",
  "identity",
  "secure",
  "account",
  "accounts",
  "myaccount",
  "my",
  "konto",
  "profile",
  // infrastructure
  "api",
  "apis",
  "gateway",
  "gw",
  "proxy",
  "edge",
  "origin",
  "cdn",
  "static",
  "assets",
  "img",
  "images",
  "prod",
  "production",
  "staging",
  "stage",
  "dev",
  "test",
  "live",
  "ssl",
  "public",
  // content sections
  "help",
  "support",
  "docs",
  "doc",
  "faq",
  "kb",
  "status",
  "blog",
  "news",
  "press",
  "careers",
  "jobs",
  "about",
  "checkout",
  "cart",
  "basket",
  "shop",
  "store",
  "pay",
  "payment",
  "payments",
  // regions and locales
  "global",
  "intl",
  "international",
  "world",
  "eu",
  "emea",
  "apac",
]);

/** Random-looking labels come from load balancers and SSO, never from a name. */
function looksRandom(label: string): boolean {
  if (label.length >= 16) return true;
  if (/\d{4,}/.test(label)) return true;
  if (/^[0-9a-f]{8,}$/i.test(label)) return true;
  if ((label.match(/-/g) ?? []).length >= 3) return true;

  const digits = (label.match(/\d/g) ?? []).length;
  return digits >= 3 && digits / label.length > 0.3;
}

/**
 * Picks a sensible amount of hostname on its own.
 *
 * The rules, in order:
 *  - On a multi-tenant platform (github.io, vercel.app, myshopify.com …) the
 *    label in front of the platform *is* the identity, so it is kept unless it
 *    looks like a generated hostname.
 *  - More than one subdomain level means infrastructure or single sign-on
 *    (auth.services.adobe.com, signin.aws.amazon.com), so the whole prefix goes.
 *  - A single subdomain that is generic, random-looking, very long or a locale
 *    code is dropped as well.
 *  - What is left is a real service name and is kept: nas.example.com stays.
 */
export function autoLabel(hostname: string): string {
  const withPrivate = parse(hostname, { allowPrivateDomains: true });
  const withoutPrivate = parse(hostname, { allowPrivateDomains: false });

  if (withPrivate.isIp || !hostname.includes(".")) return hostname;

  const publicDomain = withoutPrivate.domain;
  if (!publicDomain) return hostname;

  // github.io & friends live in the private section of the Public Suffix List,
  // where the tenant name is already part of the registrable domain.
  const privateDomain = withPrivate.domain;
  if (privateDomain && privateDomain !== publicDomain) {
    const tenant = withPrivate.domainWithoutSuffix ?? "";
    return tenant && !looksRandom(tenant) ? privateDomain : publicDomain;
  }

  const prefix = hostname.slice(0, Math.max(0, hostname.length - publicDomain.length)).replace(/\.$/, "");
  if (!prefix) return publicDomain;

  const labels = prefix.split(".").filter(Boolean);
  if (labels.length !== 1) return publicDomain;

  const candidate = labels[0];
  if (GENERIC_SUBDOMAINS.has(candidate)) return publicDomain;
  if (looksRandom(candidate)) return publicDomain;
  if (candidate.length > 12) return publicDomain;
  if (/^[a-z]{2}(-[a-z]{2})?$/.test(candidate)) return publicDomain;

  return `${candidate}.${publicDomain}`;
}

export interface HostLabelOptions {
  depth: DomainDepth;
  stripWww: boolean;
}

/** Turns a hostname into the part of it that should show up in the alias. */
export function hostToLabel(host: string, options: HostLabelOptions): string {
  let hostname = host.toLowerCase().replace(/\.$/, "");
  if (options.stripWww) {
    hostname = hostname.replace(/^www\d*\./, "");
  }

  const info = parse(hostname, { allowPrivateDomains: false });
  if (info.isIp || !hostname.includes(".")) {
    return hostname;
  }

  if (options.depth === "auto") {
    return autoLabel(hostname);
  }
  if (options.depth === "name") {
    return info.domainWithoutSuffix ?? hostname.split(".")[0];
  }
  if (options.depth === "full") {
    return hostname;
  }

  const labels = hostname.split(".");
  const suffix = info.publicSuffix ?? labels[labels.length - 1];
  const suffixLabels = suffix ? suffix.split(".").length : 1;
  const keep = Math.min(labels.length, suffixLabels + Number(options.depth));
  return labels.slice(labels.length - keep).join(".");
}
