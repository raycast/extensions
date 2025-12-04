import { DomainStatus, Status } from "./types";

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
  unknown: "Unknown status, usually resulting from an error or misconfiguration.",
  undelegated: "The domain is not present in DNS.",
  inactive: "Available for new registration.",
  pending: "TLD not yet in the root zone file.",
  disallowed: "Disallowed by the registry, ICANN, or other (wrong script, etc.).",
  claimed: "Claimed or reserved by some party (not available for new registration).",
  reserved: "Explicitly reserved by ICANN, the registry, or another party.",
  dpml: "Domains Protected Marks List, reserved for trademark holders.",
  invalid: "Technically invalid, e.g. too long or too short.",
  active: "Registered, but possibly available via the aftermarket.",
  parked: "Active and parked, possibly available via the aftermarket.",
  marketed: "Explicitly marketed as for sale via the aftermarket.",
  expiring:
    "e.g. in the Redemption Grace Period, and possibly available via a backorder service. Not guaranteed to be present for all expiring domains.",
  deleting:
    "e.g. in the Pending Delete phase, and possibly available via a backorder service. Not guaranteed to be present for all deleting domains.",
  priced: "e.g. via the BuyDomains service.",
  transferable: "e.g. in the Afternic inventory.",
  premium: "Premium domain name for sale by the registry.",
  suffix: "A public suffix according to publicsuffix.org.",
  tld: "A top-level domain.",
  zone: "A zone (domain extension) in the Domainr database.",
} as const;

type Suggestion = {
  title: string;
  subtitle?: string;
};

/** @source https://www.dreamhost.com/blog/how-to-choose-the-right-domain-name/ */
export const SEARCH_SUGGESTIONS: ReadonlyArray<Suggestion> = [
  {
    title: "Easy to pronounce and spell",
    subtitle: "Domain have to be easy to pronounce and spell. They are have to be memorable.",
  },
  {
    title: "Avoid Hyphens",
    subtitle: "They’re tough to express verbally. They also make the domain more difficult to type",
  },
  {
    title: "Avoid Using Doubled Letters",
    subtitle: "They’re hard to pronounce and spell.",
  },
  {
    title: "Keep it short!",
    subtitle: "Domain names are limited to 63 characters. However, less is more right?",
  },
  {
    title: "Stay Unique and Brandable",
    subtitle: "A unique name can help stand out and potentially help you avoid legal trouble",
  },
  {
    title: "Pick a flexible name",
    subtitle: "You don’t want to be so precise that there’s no room for your website to grow.",
  },
] as const;

export const QUERY_MIN_LENGTH: number = 1 as const;
