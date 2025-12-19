import { DomainStatus, Status } from "./types";

export const DOMAIN_RESEARCH_URL = "https://manage.fastly.com/products/domain-research";
export const DOMAIN_RESEARCH_API_URL = "https://api.fastly.com/domain-management/v1/tools/";
export const DOMAINR_URL = "https://domainr.com";
export const QUERY_MIN_LENGTH: number = 1 as const;
export const SEARCH_DEBOUNCE_MS: number = 300 as const;

export const STATUS_MAPPING: Record<Status, DomainStatus> = {
  unknown: DomainStatus.Unknown,
  undelegated: DomainStatus.Available,
  inactive: DomainStatus.Available,
  pending: DomainStatus.Pending,
  claimed: DomainStatus.Taken,
  reserved: DomainStatus.Reserved,
  disallowed: DomainStatus.Disallowed,
  dpml: DomainStatus.Reserved,
  invalid: DomainStatus.Invalid,
  active: DomainStatus.Aftermarket,
  parked: DomainStatus.Aftermarket,
  marketed: DomainStatus.Aftermarket,
  expiring: DomainStatus.Taken,
  priced: DomainStatus.Available,
  transferable: DomainStatus.Aftermarket,
  premium: DomainStatus.Available,
  suffix: DomainStatus.Disallowed,
  tld: DomainStatus.Disallowed,
  deleting: DomainStatus.Disallowed,
  zone: DomainStatus.Disallowed,
} as const;

export const STATUS_DESCRIPTIONS: Record<Status, string> = {
  unknown: "Unknown",
  undelegated: "Available",
  inactive: "Inactive",
  pending: "Coming soon",
  disallowed: "Not allowed",
  claimed: "Taken",
  reserved: "Reserved",
  dpml: "Trademark protected",
  invalid: "Invalid",
  active: "Registered",
  parked: "Parked",
  marketed: "For sale",
  expiring: "Expiring",
  deleting: "Being deleted",
  priced: "For sale",
  transferable: "For sale",
  premium: "Premium",
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
