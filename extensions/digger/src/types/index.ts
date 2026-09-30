import { WellKnownStatus } from "../utils/wellKnownCatalog";

export interface DiggerResult {
  url: string;
  overview?: OverviewData;
  metadata?: MetadataData;
  discoverability?: DiscoverabilityData;
  resources?: ResourcesData;
  networking?: NetworkingData;
  dns?: DNSData;
  performance?: PerformanceData;
  history?: HistoryData;
  dataFeeds?: DataFeedsData;
  hostMetadata?: HostMetadataData;
  wellKnown?: WellKnownData;
  theme?: ThemeData;
  botProtection?: BotProtectionData;
  /**
   * Outcome of each auxiliary lookup, so a section can say "Couldn't check"
   * itself rather than relying on a banner.
   *
   * This lives on the RESULT, not in component state, precisely so it survives
   * caching: `fetchErrors` does not, which is why a cached partial failure used
   * to show failed rows with nothing left on screen to explain them.
   */
  lookups?: Partial<Record<FetchCategory, ResourceStatus>>;
  fetchedAt: number;
}

export interface BotProtectionData {
  /** Whether bot protection was detected */
  detected: boolean;
  /** The type of protection detected (e.g., "cloudflare", "akamai") */
  provider?: string;
  /** Human-readable name of the provider */
  providerName?: string;
  /** Whether the response appears to be a challenge page rather than real content */
  isChallengePage: boolean;
}

export interface CacheEntry {
  url: string;
  data: DiggerResult;
  timestamp: number;
  lastAccessed: number;
}

export interface OverviewData {
  title?: string;
  description?: string;
  favicon?: string;
  language?: string;
  /**
   * `Content-Language` response header. Independent of the `<html lang>`
   * attribute and free to disagree with it — github.com sends `en-US` here while
   * its markup says `en`.
   */
  contentLanguage?: string;
  /**
   * The page is served in more than one language, so `language` describes the
   * variant WE received rather than the site. Set when the response varies on
   * Accept-Language or the markup declares `hreflang` alternates.
   */
  languageNegotiated?: boolean;
  /** Number of `hreflang` alternates declared. apple.com publishes 137. */
  languageAlternates?: number;
  /** The Accept-Language Digger sent, so the received variant can be read in context. */
  languageRequested?: string;
  charset?: string;
}

export interface MetadataData {
  openGraph?: Record<string, string>;
  twitterCard?: Record<string, string>;
  jsonLd?: Array<Record<string, unknown>>;
  metaTags?: Array<{ name?: string; property?: string; content?: string }>;
}

/** Parsed Content-Signal directive values from robots.txt */
export interface ContentSignalsData {
  /** Whether content can be indexed by search engines */
  search?: "yes" | "no";
  /** Whether content can be used as AI input (RAG, grounding, etc.) */
  aiInput?: "yes" | "no";
  /** Whether content can be used for AI model training */
  aiTrain?: "yes" | "no";
  /** Raw unparsed signal pairs for any unrecognized keys */
  raw?: string;
}

/**
 * Payment signal data derived from x402 protocol evidence.
 * Sources: HTTP 402 status code, PAYMENT-REQUIRED header, PAYMENT-RESPONSE header.
 * Spec: https://www.x402.org / https://docs.cdp.coinbase.com/x402
 */
export interface PaymentSignalsData {
  /** Whether any x402 payment-required signal was detected */
  detected: boolean;
  /** HTTP 402 status code was returned */
  statusCode402?: boolean;
  /** PAYMENT-REQUIRED header was present (server advertises payment terms) */
  paymentRequired?: boolean;
  /** PAYMENT-RESPONSE header was present (server confirmed a prior payment) */
  paymentResponse?: boolean;
  /** Raw value of the PAYMENT-REQUIRED header, if present */
  paymentRequiredRaw?: string;
  /** Raw value of the PAYMENT-RESPONSE header, if present */
  paymentResponseRaw?: string;
}

/**
 * Outcome of fetching a well-known resource (robots.txt, llms.txt, sitemap.xml).
 *
 * `absent` and `unavailable` are deliberately distinct. A 404 is a real answer —
 * the site publishes no robots.txt. A 500, a timeout, or a refused connection is
 * NOT an answer: we do not know what the site publishes. Collapsing both into
 * "Not found" states something we never established.
 */
export type ResourceStatus = "found" | "absent" | "unavailable";

export interface DiscoverabilityData {
  robots?: string;
  robotsTxt?: ResourceStatus;
  canonical?: string;
  /** Language/region alternate links (hreflang). Feed alternates are in DataFeedsData. */
  alternates?: Array<{ href: string; hreflang?: string; type?: string }>;
  sitemap?: string;
  /** Outcome of fetching sitemap.xml, independent of whether the HTML declared one. */
  sitemapStatus?: ResourceStatus;
  llmsTxt?: ResourceStatus;
  /** Parsed Content-Signal directives from robots.txt (IETF aipref / Cloudflare Content Signals) */
  contentSignals?: ContentSignalsData;
  /** x402 payment-required signals detected from HTTP response */
  paymentSignals?: PaymentSignalsData;
}

/** Image asset type indicating the source of the image */
export type ImageAssetType =
  | "favicon" // <link rel="icon"> or <link rel="shortcut icon">
  | "apple-touch-icon" // <link rel="apple-touch-icon">
  | "mask-icon" // <link rel="mask-icon"> (Safari pinned tabs)
  | "og" // <meta property="og:image">
  | "twitter" // <meta name="twitter:image">
  | "msapplication" // <meta name="msapplication-TileImage">
  | "json-ld" // From JSON-LD structured data
  | "manifest-icon" // From manifest.json icons array
  | "manifest-screenshot" // From manifest.json screenshots array
  | "manifest-shortcut"; // From manifest.json shortcut icons

/** Font provider type indicating the source of the font */
export type FontProvider =
  | "google-fonts" // fonts.googleapis.com or fonts.gstatic.com
  | "adobe-fonts" // use.typekit.net or typekit.com
  | "font-awesome" // Font Awesome CDN
  | "bunny-fonts" // fonts.bunny.net (privacy-focused Google Fonts alternative)
  | "fontshare" // api.fontshare.com
  | "fonts-com" // fast.fonts.net
  | "custom"; // Self-hosted or other providers

/** Represents a font asset found in the head of the page */
export interface FontAsset {
  /** Font family name (e.g., "Roboto", "Open Sans") */
  family: string;
  /** Provider name */
  provider: FontProvider;
  /** Source URL */
  url: string;
  /** Font variants/weights if detectable (e.g., "400", "700") */
  variants?: string[];
  /** Font format if specified (e.g., "woff2", "ttf") */
  format?: string;
  /** Font style if detectable (e.g., "italic", "oblique") */
  style?: string;
}

/** Represents an image asset found in the head of the page */
export interface ImageAsset {
  /** URL of the image */
  src: string;
  /** Alt text if available */
  alt?: string;
  /** Type/source of the image */
  type: ImageAssetType;
  /** Size specification (e.g., "180x180", "32x32") */
  sizes?: string;
  /** MIME type if specified */
  mimeType?: string;
}

export interface ResourcesData {
  stylesheets?: Array<{ href: string; media?: string }>;
  scripts?: Array<{ src: string; async?: boolean; defer?: boolean; type?: string }>;
  /** All image assets found (may contain duplicates by URL) */
  images?: ImageAsset[];
  links?: Array<{ href: string; rel?: string }>;
  /** Theme color from <meta name="theme-color"> */
  themeColor?: string;
  /** Font assets found in the page */
  fonts?: FontAsset[];
}

export interface NetworkingData {
  server?: string;
  headers?: Record<string, string>;
  statusCode?: number;
  finalUrl?: string;
}

/** The record types a DNS lookup queries, used to report which ones failed. */
export type DNSRecordKind = "a" | "aaaa" | "cname" | "mx" | "ns" | "txt";

export interface DNSData {
  aRecords?: string[];
  aaaaRecords?: string[];
  mxRecords?: Array<{ priority: number; exchange: string }>;
  txtRecords?: string[];
  nsRecords?: string[];
  cnameRecord?: string;
  /**
   * Record types whose query failed for a non-benign reason. An empty result for
   * a type listed here means "we could not check", NOT "the host publishes none"
   * — the two render differently and only one of them is a fact about the host.
   * Absent on entries cached before this field existed, which reads as "nothing
   * known to have failed" and matches the old behaviour.
   */
  unchecked?: DNSRecordKind[];
}

export interface PerformanceData {
  loadTime?: number;
  pageSize?: number;
}

export interface HistoryData {
  waybackMachineSnapshots?: number;
  /** Whether the snapshot count is an estimate (true) or precise (false) */
  isEstimate?: boolean;
  firstSeen?: string;
  lastSeen?: string;
  archiveUrl?: string;
  rateLimited?: boolean;
}

export interface DataFeedsData {
  rss?: Array<{ url: string; title?: string }>;
  atom?: Array<{ url: string; title?: string }>;
  json?: Array<{ url: string; title?: string }>;
}

// RFC 6415
export interface HostMetadataData {
  available: boolean;
  properties?: Record<string, string>;
  links?: Array<{
    rel: string;
    href?: string;
    template?: string;
    type?: string;
    title?: string;
  }>;
  format?: "xrd" | "jrd";
}

/**
 * One file actually published under `/.well-known/`.
 *
 * Only files that passed the content-type judgement in `wellKnownUtils` become
 * hits, so the absence of a path here means the host answered for it — not that
 * the probe was skipped. Paths whose probe never got an answer are listed
 * separately in `WellKnownData.unchecked`.
 */
export interface WellKnownHit {
  /** Path segment under `/.well-known/`, e.g. `security.txt`. */
  path: string;
  /** Absolute URL, post-redirect. */
  url: string;
  /** IANA registration status, or "unregistered" for the deployed-but-unlisted tail. */
  registration: WellKnownStatus;
  /** Spec or documentation URL for the file's format. */
  reference?: string;
  contentType: string;
  /** From `Content-Length`; absent when the response was chunked. */
  size?: number;
}

export interface WellKnownData {
  hits: WellKnownHit[];
  /** How many catalog paths were probed, so the UI can say what "none" was drawn from. */
  probed: number;
  /**
   * Paths whose probe failed outright. NOT the same as "not published" — these
   * were never answered, and folding them into absence is the mistake this
   * codebase documents in AGENTS.md. Optional so entries cached under the older
   * shape still render.
   */
  unchecked?: string[];
  /**
   * The host returned a plausible file for a control path nothing publishes, so
   * every per-path answer is that same catch-all. `hits` is emptied when this is
   * set: the sweep ran, and established nothing.
   */
  catchAll?: boolean;
  /**
   * The control probe itself failed, so whether this host is a catch-all was
   * never established — and `hits` therefore carries less confidence than usual.
   */
  controlUnchecked?: boolean;
}

/** One colour a page declares: a token with a name, or a theme-color with a media query. */
export interface ThemeColor {
  /** Custom-property or meta name. Absent for a bare `theme-color`. */
  name?: string;
  value: string;
  /** The media query a `theme-color` is scoped to, e.g. `(prefers-color-scheme: dark)`. */
  media?: string;
  /** Where it was declared. Stylesheet tokens cost a request; markup ones do not. */
  source?: "markup" | "stylesheet";
  /**
   * `value` converted to `#rrggbb`, which is the only form a swatch can render.
   * Absent when the value is a system keyword (`Canvas`) or an unresolvable
   * reference — an empty swatch there is correct, not a bug.
   */
  hex?: string;
}

/**
 * Theme signals declared in the page's own markup.
 *
 * Parsed from the HTML already fetched for the dig, so this never costs a
 * request — and equally, it cannot see custom properties a page sets from
 * JavaScript after load. This is what the SERVER declares, not what the browser
 * ends up rendering.
 */
export interface ThemeData {
  /** `<meta name="theme-color">`, one per media query. */
  themeColors: ThemeColor[];
  /** `<meta name="color-scheme">`, e.g. "light dark". */
  colorScheme?: string;
  /** A `light` / `dark` class on <html>. */
  schemeClass?: string;
  /** `<meta name="apple-mobile-web-app-status-bar-style">`. */
  statusBarStyle?: string;
  /** Theme-bearing `data-*` attributes on <html>, e.g. `data-accent-color`. */
  attributes: Record<string, string>;
  /** Vendor chrome colours: msapplication tile and nav-button. */
  vendorColors: ThemeColor[];
  /** CSS custom properties whose value is a colour. */
  tokens: ThemeColor[];
  /**
   * Outcome of reading the linked stylesheets. Absent when none were scanned —
   * which is not the same as scanning them and finding nothing.
   */
  stylesheets?: {
    /** How many were read, out of how many the page links. */
    scanned: number;
    linked: number;
    /** Sheets that could not be fetched. Their tokens are unknown, not absent. */
    unchecked: number;
    /** True when the token cap was hit, so the list is a sample not a census. */
    truncated?: boolean;
  };
}

/** Categories that can fail independently during fetch */
export type FetchCategory =
  | "main"
  | "dns"
  | "certificate"
  | "wayback"
  | "hostMeta"
  | "wellKnown"
  | "stylesheets"
  | "robots"
  | "sitemap"
  | "llmsTxt";

/** Represents an error that occurred during fetching */
export interface FetchError {
  category: FetchCategory;
  message: string;
  /** User-friendly description of what failed */
  description: string;
  /** Whether this error is recoverable (can retry) */
  recoverable: boolean;
  /** Timestamp when the error occurred */
  timestamp: number;
}

/** Error classification for better user messaging */
export type ErrorType =
  | "network" // Connection failed, timeout, DNS resolution
  | "blocked" // Bot protection, firewall, rate limiting
  | "notFound" // 404, domain doesn't exist
  | "serverError" // 5xx errors
  | "invalid" // Invalid URL, malformed response
  | "unknown"; // Unclassified errors
