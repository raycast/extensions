import { DomainStatus, StatusValue } from "./types";

export const DOMAIN_RESEARCH_URL = "https://manage.fastly.com/products/domain-research";
export const DOMAIN_RESEARCH_API_URL = "https://api.fastly.com/domain-management/v1/tools/";
export const DOMAINR_URL = "https://domainr.com";
export const QUERY_MIN_LENGTH: number = 1 as const;
export const SEARCH_DEBOUNCE_MS: number = 300 as const;

/**
 * Maps API status values to simplified availability categories.
 * Inspired by the Domainr Mac app's three-state model:
 * - Available: Can register directly
 * - Maybe: Registered but potentially obtainable (aftermarket, expiring)
 * - Unavailable: Cannot be obtained
 */
export const STATUS_MAPPING: Record<StatusValue, DomainStatus> = {
  // Available - can register directly
  undelegated: DomainStatus.Available,
  inactive: DomainStatus.Available,
  pending: DomainStatus.Available,
  priced: DomainStatus.Available,
  premium: DomainStatus.Available,

  // Maybe - registered but potentially obtainable
  parked: DomainStatus.Maybe,
  marketed: DomainStatus.Maybe,
  transferable: DomainStatus.Maybe,
  expiring: DomainStatus.Maybe,
  deleting: DomainStatus.Maybe,

  // Unavailable - cannot be obtained
  active: DomainStatus.Unavailable,
  unknown: DomainStatus.Unavailable,
  claimed: DomainStatus.Unavailable,
  reserved: DomainStatus.Unavailable,
  disallowed: DomainStatus.Unavailable,
  dpml: DomainStatus.Unavailable,
  invalid: DomainStatus.Unavailable,
  suffix: DomainStatus.Unavailable,
  tld: DomainStatus.Unavailable,
  zone: DomainStatus.Unavailable,
} as const;

/**
 * User-friendly descriptions for each API status value.
 * Used as subtitles in the "All" view for a clean UX.
 */
export const STATUS_DESCRIPTIONS: Record<StatusValue, string> = {
  // Available
  undelegated: "Available",
  inactive: "Available",
  pending: "Coming soon",
  priced: "For sale",
  premium: "Premium",

  // Maybe
  parked: "Maybe",
  marketed: "For sale",
  transferable: "For sale",
  expiring: "Expiring",
  deleting: "Expiring",

  // Unavailable
  active: "Unavailable",
  unknown: "Unavailable",
  claimed: "Unavailable",
  reserved: "Reserved",
  disallowed: "Unavailable",
  dpml: "Reserved",
  invalid: "Unavailable",
  suffix: "Unavailable",
  tld: "Unavailable",
  zone: "Unavailable",
} as const;

/**
 * Detailed descriptions for each API status value.
 * Used as subtitles in filtered views to provide more context.
 */
export const STATUS_DETAILS: Record<StatusValue, string> = {
  // Available
  undelegated: "Not in DNS",
  inactive: "Available for registration",
  pending: "TLD coming soon",
  priced: "Premium pricing",
  premium: "Premium domain",

  // Maybe
  parked: "Parked domain",
  marketed: "Listed for sale",
  transferable: "Fast transfer available",
  expiring: "Expiring soon",
  deleting: "Pending deletion",

  // Unavailable
  active: "Taken",
  unknown: "Status unknown",
  claimed: "Taken",
  reserved: "Reserved by registry",
  disallowed: "Not allowed",
  dpml: "Trademark protected",
  invalid: "Invalid domain",
  suffix: "Public suffix",
  tld: "Top-level domain",
  zone: "Domain extension",
} as const;

type Suggestion = {
  title: string;
  subtitle?: string;
};

/** @source https://www.dreamhost.com/blog/how-to-choose-the-right-domain-name/ */
export const SEARCH_SUGGESTIONS: ReadonlyArray<Suggestion> = [
  {
    title: "Easy to pronounce and spell",
    subtitle: "Domains have to be easy to pronounce and spell. They have to be memorable.",
  },
  {
    title: "Avoid hyphens",
    subtitle: "They're tough to express verbally. They also make the domain more difficult to type",
  },
  {
    title: "Avoid using doubled letters",
    subtitle: "They're hard to pronounce and spell.",
  },
  {
    title: "Keep it short!",
    subtitle: "Domain names are limited to 63 characters. Less is more.",
  },
  {
    title: "Stay unique and brandable",
    subtitle: "A unique name helps you stand out and potentially avoids legal trouble.",
  },
  {
    title: "Pick a flexible name",
    subtitle: "Don't be so precise that there's no room for your website to grow.",
  },
] as const;
