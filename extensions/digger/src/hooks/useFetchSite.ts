import * as cheerio from "cheerio";
import { useCallback, useRef, useState } from "react";
import { Clipboard, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  BotProtectionData,
  ContentSignalsData,
  DiggerResult,
  DiscoverabilityData,
  ErrorType,
  FetchCategory,
  FetchError,
  FontAsset,
  ImageAsset,
  MetadataData,
  OverviewData,
  PaymentSignalsData,
} from "../types";
import { detectBotProtection } from "../utils/botDetection";
import { LIMITS } from "../utils/config";
import { CertificateInfo, getTLSCertificateInfo, performDNSLookup } from "../utils/dnsUtils";
import { buildErrorReport, getErrorTitle } from "../utils/errorReport";
import { fetchHeadOnlyWithFallback, fetchTextResource, fetchWithTimeout } from "../utils/fetcher";
import {
  deduplicateFonts,
  extractInlineStyles,
  extractPreloadFont,
  parseFontFaceFromCSS,
  parseFontsFromUrl,
} from "../utils/fontUtils";
import { fetchHostMetadata } from "../utils/hostMetaUtils";
import { getLogger } from "../utils/logger";
import { getRootResourceUrl, normalizeUrl, redactUrlForLog } from "../utils/urlUtils";
import { fetchWaybackMachineData } from "../utils/waybackUtils";
import { useCache } from "./useCache";

const log = getLogger("fetch");

/** Classify an error for better user messaging */
/**
 * Flattens an error and its `cause` chain, outermost first.
 *
 * Node's `fetch` reports every transport failure as the same opaque
 * `TypeError: fetch failed` and puts the real reason one level down in `cause`:
 * `getaddrinfo ENOTFOUND example.com`. Reading only `.message`, as this file used
 * to, means a dead domain matches none of the classifier's keywords and lands in
 * the "unknown" bucket — which is why a failed dig showed a bare "Fetch Error"
 * with the two generic suggestions instead of "Connection Failed" and the four
 * network ones.
 *
 * `code` is appended where present because that, not the prose, is what carries
 * ENOTFOUND / ECONNREFUSED.
 */
function errorChain(error: unknown): string[] {
  const parts: string[] = [];
  let current: unknown = error;
  // Bounded: a malformed `cause` cycle must not spin here.
  for (let depth = 0; current != null && depth < 5; depth++) {
    if (current instanceof Error) {
      const code = (current as Error & { code?: string }).code;
      parts.push(code ? `${current.message} (${code})` : current.message);
      current = current.cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.filter(Boolean);
}

/** The most specific detail in an error chain — the deepest cause. */
function errorDetail(error: unknown): string {
  return errorChain(error).at(-1) ?? String(error);
}

function classifyError(
  error: unknown,
  statusCode?: number,
): { type: ErrorType; message: string; recoverable: boolean } {
  const chain = errorChain(error);
  const errorMessage = chain.at(-1) ?? String(error);
  // Match across the WHOLE chain, not just the outermost message.
  const lowerMessage = chain.join(" ").toLowerCase();

  // Network errors
  if (
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("enotfound") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("dns")
  ) {
    return {
      type: "network",
      message: "Unable to connect to the website. Check if the URL is correct and the site is online.",
      recoverable: true,
    };
  }

  // Bot protection / blocking
  if (
    lowerMessage.includes("blocked") ||
    lowerMessage.includes("forbidden") ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("captcha") ||
    lowerMessage.includes("challenge") ||
    statusCode === 403 ||
    statusCode === 429
  ) {
    return {
      type: "blocked",
      message: "Access was blocked. The site may have bot protection or rate limiting.",
      recoverable: true,
    };
  }

  // Not found
  if (lowerMessage.includes("not found") || statusCode === 404) {
    return {
      type: "notFound",
      message: "The page was not found. Check if the URL is correct.",
      recoverable: false,
    };
  }

  // Server errors
  if (statusCode && statusCode >= 500) {
    return {
      type: "serverError",
      message: "The server encountered an error. Try again later.",
      recoverable: true,
    };
  }

  // Invalid URL
  if (lowerMessage.includes("invalid") || lowerMessage.includes("malformed")) {
    return {
      type: "invalid",
      message: "The URL appears to be invalid. Please check the format.",
      recoverable: false,
    };
  }

  return {
    type: "unknown",
    message: errorMessage || "An unexpected error occurred.",
    recoverable: true,
  };
}

/** Get user-friendly description for a fetch category */
function getCategoryDescription(category: FetchCategory): string {
  const descriptions: Record<FetchCategory, string> = {
    main: "Main page content",
    dns: "DNS records",
    certificate: "SSL certificate",
    wayback: "Wayback Machine history",
    hostMeta: "Host metadata",
    robots: "robots.txt",
    sitemap: "Sitemap",
    llmsTxt: "llms.txt",
  };
  return descriptions[category];
}

/**
 * Parses Content-Signal directives from robots.txt content.
 * Looks for lines matching: Content-Signal: key=value[, key=value...]
 * Merges all matching directives found (last value wins per key).
 */
function parseContentSignals(robotsTxtContent: string): ContentSignalsData | undefined {
  const signalLineRegex = /^Content-Signal\s*:\s*(.+)$/gim;
  const result: ContentSignalsData = {};
  const rawParts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = signalLineRegex.exec(robotsTxtContent)) !== null) {
    const rawValue = match[1].trim();
    rawParts.push(rawValue);

    const pairs = rawValue.split(/\s*,\s*/);
    for (const pair of pairs) {
      const [key, val] = pair.split("=").map((s) => s.trim().toLowerCase());
      const normalized = val === "yes" || val === "no" ? (val as "yes" | "no") : undefined;
      if (!normalized) continue;
      if (key === "search") result.search = normalized;
      else if (key === "ai-input") result.aiInput = normalized;
      else if (key === "ai-train") result.aiTrain = normalized;
    }
  }

  const hasRecognized = result.search !== undefined || result.aiInput !== undefined || result.aiTrain !== undefined;
  if (!hasRecognized) return undefined;
  result.raw = rawParts.length > 0 ? rawParts.join(", ") : undefined;
  return result;
}

/**
 * Detects x402 payment-required signals from HTTP response evidence.
 * Checks for HTTP 402 status code and x402 protocol headers:
 * - PAYMENT-REQUIRED: server advertises payment terms (sent with 402)
 * - PAYMENT-RESPONSE: server confirms a prior payment (sent with 200)
 */
function detectPaymentSignals(statusCode: number, headers: Record<string, string>): PaymentSignalsData | undefined {
  const paymentRequiredRaw = headers["payment-required"];
  const paymentResponseRaw = headers["payment-response"];

  const statusCode402 = statusCode === 402;
  const paymentRequired = !!paymentRequiredRaw;
  const paymentResponse = !!paymentResponseRaw;

  const detected = statusCode402 || paymentRequired || paymentResponse;
  if (!detected) return undefined;

  return {
    detected,
    statusCode402: statusCode402 || undefined,
    paymentRequired: paymentRequired || undefined,
    paymentResponse: paymentResponse || undefined,
    paymentRequiredRaw,
    paymentResponseRaw,
  };
}

export interface LoadingProgress {
  overview: number;
  metadata: number;
  discoverability: number;
  resources: number;
  networking: number;
  dns: number;
  history: number;
  dataFeeds: number;
}

const initialProgress: LoadingProgress = {
  overview: 0,
  metadata: 0,
  discoverability: 0,
  resources: 0,
  networking: 0,
  dns: 0,
  history: 0,
  dataFeeds: 0,
};

export function useFetchSite(url?: string) {
  const [data, setData] = useState<DiggerResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [fetchErrors, setFetchErrors] = useState<FetchError[]>([]);
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [progress, setProgress] = useState<LoadingProgress>(initialProgress);
  const { getFromCache, saveToCache } = useCache();

  // Helper to add a partial fetch error
  const addFetchError = (category: FetchCategory, error: unknown, recoverable = true) => {
    const classified = classifyError(error);
    const fetchError: FetchError = {
      category,
      // The deepest cause, not the outermost message: this line is the
      // per-component technical detail in the error card, so "getaddrinfo
      // ENOTFOUND example.com (ENOTFOUND)" earns its place where a second copy
      // of "fetch failed" would not.
      message: errorDetail(error),
      description: getCategoryDescription(category),
      recoverable: recoverable && classified.recoverable,
      timestamp: Date.now(),
    };
    setFetchErrors((prev) => [...prev.filter((e) => e.category !== category), fetchError]);
    log.log("fetch:partial-error", { category, message: fetchError.message });
  };

  // Store abort controller in ref so we can cancel previous fetches
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSite = useCallback(
    async (targetUrl: string) => {
      log.log("fetch:start", { targetUrl });

      // Cancel any previous fetch in progress
      if (abortControllerRef.current) {
        log.log("fetch:cancelling-previous", { targetUrl });
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this fetch
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setError(null);
      setErrorType(null);
      setFetchErrors([]);
      setProgress(initialProgress);
      // Reset with the rest. The cert handler below only writes when the lookup
      // SUCCEEDS (`if (certInfo)`), so without clearing here a dig whose TLS
      // lookup returns null — socket error or timeout — keeps rendering the
      // PREVIOUS site's certificate as though it were this one's.
      setCertificateInfo(null);

      // True once a NEWER fetch has taken over. Every state write below is
      // owned by this fetch, so once it is superseded none of them may land.
      //
      // Aborting does not cancel the underlying DNS/TLS/Wayback/host-meta work —
      // it only resolves the withAbort() wrapper with its fallback. That
      // resolution still runs the `.then()` handlers ~700 lines down, which
      // otherwise write `undefined` and progress=1 into the state the NEW fetch
      // is building. Dig site A, then quickly dig site B, and B's DNS panel
      // blanks while its progress bar jumps to complete.
      const isSuperseded = () => abortController.signal.aborted;

      // Whether this fetch still OWNS the view — a strictly different question
      // from `isSuperseded()`, and the one the error card and the spinner turn on.
      //
      // This fetch aborts its own controller after a failure to stop its pending
      // auxiliary work, which flips the very same `signal.aborted` a newer fetch
      // flips. Reading the signal alone therefore made a genuine failure look like
      // a cancellation, and it silently skipped both setError and
      // setIsLoading(false) — a dead site spun forever with no message.
      //
      // The obvious repair, a "did I abort myself?" flag, is wrong in the other
      // direction: it records our own history and knows nothing about who owns the
      // view NOW. Between the failure and the `finally` there is an
      // `await showFailureToast`, and a Retry started during that await would set
      // its own spinner — which our stale flag would then switch off.
      //
      // The ref is the single source of truth for ownership: it points at whichever
      // fetch is current, so identity against it answers the question directly and
      // cannot go stale.
      const ownsView = () => abortControllerRef.current === abortController;

      // Helper to update progress for a specific category
      const updateProgress = (category: keyof LoadingProgress, value: number) => {
        if (isSuperseded()) return;
        setProgress((prev) => ({ ...prev, [category]: value }));
      };

      // Start all categories at initial loading state (0.1 = started)
      setProgress({
        overview: 0.1,
        metadata: 0.1,
        discoverability: 0.1,
        resources: 0.1,
        networking: 0.1,
        dns: 0.1,
        history: 0.1,
        dataFeeds: 0.1,
      });

      // Helper to update data progressively
      const updateData = (partial: Partial<DiggerResult>) => {
        if (isSuperseded()) return;
        setData((prev) => (prev ? { ...prev, ...partial } : (partial as DiggerResult)));
      };

      try {
        const normalizedUrl = normalizeUrl(targetUrl);
        log.log("fetch:normalized", { normalizedUrl });

        const cached = await getFromCache(normalizedUrl);
        // A newer fetch can start during the cache read, and a cache hit is the
        // FASTEST path here — dig a cached site, immediately dig another, and
        // without this the first one's cached payload lands on top of the second,
        // with every progress bar forced to complete and the spinner stopped.
        if (isSuperseded()) {
          log.log("fetch:superseded", { url: normalizedUrl, at: "cache-read" });
          return;
        }
        if (cached) {
          log.log("cache:hit", { url: normalizedUrl });
          setData(cached);
          setProgress({
            overview: 1,
            metadata: 1,
            discoverability: 1,
            resources: 1,
            networking: 1,
            dns: 1,
            history: 1,
            dataFeeds: 1,
          });
          setIsLoading(false);
          return;
        }
        log.log("cache:miss", { url: normalizedUrl });

        // Check if we were aborted while checking cache (React double-invoke)
        if (abortController.signal.aborted) {
          log.log("fetch:aborted-before-fetch", { url: normalizedUrl });
          return;
        }

        // Initialize data with URL immediately
        setData({ url: normalizedUrl, fetchedAt: Date.now() } as DiggerResult);

        log.log("fetch:resources", { url: normalizedUrl });
        // Update networking progress - fetching started
        updateProgress("networking", 0.3);

        // Start async fetches for DNS, Wayback, etc. early (don't await yet)
        const urlObj = new URL(normalizedUrl);
        const hostname = urlObj.hostname;

        // Start these in parallel immediately - they're independent of HTML parsing
        updateProgress("dns", 0.3);
        updateProgress("history", 0.3);

        // Helper to wrap async operations with abort signal support.
        //
        // The timer starts HERE, at kickoff, and stops in the reaction attached
        // to the underlying promise — deliberately not in the `.then()` handlers
        // ~500 lines below, which are wired up only after the main HTML parse and
        // would bill that parse to whichever fetch finished first.
        //
        // What this measures is end-to-end latency from kickoff to when the
        // reaction could run, NOT pure network time: the reaction is a microtask,
        // so a long synchronous parse holding the main thread inflates the
        // number. Read these as "which of the four was the straggler", which is
        // the question they exist to answer — not as a network benchmark.
        function withAbort<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
          const done = log.time(label);
          // `log.time()` hands back an unguarded closure, and abort can race the
          // promise settling — without this gate a slow fetch logs two durations.
          let stopped = false;
          const stop = (meta?: Record<string, unknown>) => {
            if (stopped) return;
            stopped = true;
            done(meta);
          };

          if (abortController.signal.aborted) {
            stop({ skipped: "aborted before start" });
            return Promise.resolve(fallback);
          }
          return new Promise((resolve) => {
            const onAbort = () => {
              stop({ aborted: true });
              resolve(fallback);
            };
            // `{ once: true }` only unregisters the listener if it actually
            // FIRES. On the normal path — the fetch simply finishes — it never
            // does, so without the explicit removal below each of these four
            // wrappers leaves a listener holding `resolve` and the timer closure
            // alive for as long as the controller does. Bounded, because the next
            // fetch swaps in a fresh controller, but it means a long-lived view
            // retains dead per-fetch machinery it can never use.
            abortController.signal.addEventListener("abort", onAbort, { once: true });
            const release = () => abortController.signal.removeEventListener("abort", onAbort);

            promise
              .then((value) => {
                release();
                stop();
                resolve(value);
              })
              .catch((error) => {
                release();
                stop({ failed: error instanceof Error ? error.message : String(error) });
                resolve(fallback);
              });
          });
        }

        const dnsPromise = withAbort("dns", performDNSLookup(hostname), undefined);
        const certPromise = withAbort("cert", getTLSCertificateInfo(hostname), null);
        const waybackPromise = withAbort("wayback", fetchWaybackMachineData(normalizedUrl), undefined);
        const hostMetaPromise = withAbort("hostmeta", fetchHostMetadata(normalizedUrl), undefined);

        // Use streaming fetch for main HTML to avoid memory issues on large pages
        // Use getRootResourceUrl to ensure robots.txt, llms.txt and sitemap.xml are fetched from the domain root
        const robotsUrl = getRootResourceUrl("robots.txt", normalizedUrl);
        const llmsTxtUrl = getRootResourceUrl("llms.txt", normalizedUrl);
        const sitemapUrl = getRootResourceUrl("sitemap.xml", normalizedUrl);
        const [htmlResult, robotsTxtResult, llmsTxtResult, sitemapResult] = await Promise.allSettled([
          fetchHeadOnlyWithFallback(normalizedUrl, undefined, abortController.signal),
          robotsUrl ? fetchTextResource(robotsUrl).catch(() => null) : Promise.resolve(null),
          llmsTxtUrl ? fetchTextResource(llmsTxtUrl).catch(() => null) : Promise.resolve(null),
          sitemapUrl ? fetchWithTimeout(sitemapUrl).catch(() => null) : Promise.resolve(null),
        ]);

        if (htmlResult.status === "rejected") {
          log.error("fetch:failed", { url: redactUrlForLog(normalizedUrl), error: htmlResult.reason });
          // Cancel all pending async operations. The catch distinguishes this
          // self-abort from a supersede by ownership, not by a flag.
          abortController.abort();
          log.log("fetch:aborted-async-operations", { reason: "main fetch failed" });
          // Rethrow the ORIGINAL rejection rather than a synthetic message.
          // classifyError works by keyword-matching the error chain, so replacing
          // it with "Failed to fetch website" — a string containing none of those
          // keywords — guaranteed the "unknown" bucket and the generic card.
          throw htmlResult.reason instanceof Error
            ? htmlResult.reason
            : new Error(`Failed to fetch website: ${String(htmlResult.reason)}`);
        }

        const { headHtml: streamedHtml, status, headers, timing, finalUrl, truncated } = htmlResult.value;
        log.log("fetch:response", { status, finalUrl, timing, truncated, htmlLength: streamedHtml.length });

        // Networking data is now available - update immediately
        updateProgress("networking", 1);
        updateData({
          networking: {
            statusCode: status,
            headers,
            finalUrl,
            server: headers.server,
          },
          performance: {
            loadTime: timing,
            pageSize: streamedHtml.length,
          },
        });

        log.log("parse:start", { htmlLength: streamedHtml.length, truncated });

        // Update progress - HTML parsing started
        updateProgress("overview", 0.5);
        updateProgress("metadata", 0.3);
        updateProgress("discoverability", 0.3);
        updateProgress("resources", 0.3);
        updateProgress("dataFeeds", 0.3);

        // Parse the streamed HTML (already limited to head content)
        const $ = cheerio.load(streamedHtml);

        // Get language from html tag (it's at the start of the streamed content)
        const langMatch = streamedHtml.match(/<html[^>]*\slang=["']([^"']+)["']/i);

        const rawTitle = $("title").text() || undefined;

        // Detect bot protection before processing further
        const botProtectionResult = detectBotProtection({
          statusCode: status,
          headers,
          title: rawTitle,
          html: streamedHtml,
        });

        let botProtection: BotProtectionData | undefined;
        if (botProtectionResult.detected) {
          log.log("parse:bot-protection-detected", {
            provider: botProtectionResult.provider,
            isChallenge: botProtectionResult.isChallengePage,
            confidence: botProtectionResult.confidence,
          });
          botProtection = {
            detected: true,
            provider: botProtectionResult.provider,
            providerName: botProtectionResult.providerName,
            isChallengePage: botProtectionResult.isChallengePage,
          };
        }

        // If it's a challenge page, don't use the fake title
        const effectiveTitle = botProtectionResult.isChallengePage ? undefined : rawTitle;

        const overview: OverviewData = {
          title: effectiveTitle,
          description: botProtectionResult.isChallengePage ? undefined : $('meta[name="description"]').attr("content"),
          language: langMatch?.[1],
          charset: $("meta[charset]").attr("charset") || undefined,
        };
        log.log("parse:overview", {
          title: overview.title,
          language: overview.language,
          isChallengePage: botProtectionResult.isChallengePage,
        });

        // Overview parsing complete - update immediately
        updateProgress("overview", 1);
        updateData({ overview, botProtection });

        const openGraph: Record<string, string> = {};
        $('meta[property^="og:"]').each((_, el) => {
          const property = $(el).attr("property");
          const content = $(el).attr("content");
          if (property && content) {
            openGraph[property] = content;
          }
        });

        const twitterCard: Record<string, string> = {};
        $('meta[name^="twitter:"]').each((_, el) => {
          const name = $(el).attr("name");
          const content = $(el).attr("content");
          if (name && content) {
            twitterCard[name] = content;
          }
        });

        // Extract JSON-LD using existing $ instance
        const jsonLdScripts: Array<Record<string, unknown>> = [];
        $('script[type="application/ld+json"]').each((_, element) => {
          try {
            const content = $(element).html();
            if (content) {
              jsonLdScripts.push(JSON.parse(content));
            }
          } catch {
            // Skip invalid JSON-LD
          }
        });

        // Extract meta tags using existing $ instance
        const metaTags: Array<{ name?: string; property?: string; content?: string }> = [];
        $("meta").each((_, element) => {
          const $meta = $(element);
          const name = $meta.attr("name");
          const property = $meta.attr("property");
          const content = $meta.attr("content");
          if ((name || property) && content) {
            metaTags.push({ name, property, content });
          }
        });

        // If it's a challenge page, don't include the fake metadata
        const metadata: MetadataData = botProtectionResult.isChallengePage
          ? {}
          : {
              openGraph: Object.keys(openGraph).length > 0 ? openGraph : undefined,
              twitterCard: Object.keys(twitterCard).length > 0 ? twitterCard : undefined,
              jsonLd: jsonLdScripts.length > 0 ? jsonLdScripts : undefined,
              metaTags: metaTags.length > 0 ? metaTags : undefined,
            };
        log.log("parse:metadata", {
          ogTags: Object.keys(openGraph).length,
          twitterTags: Object.keys(twitterCard).length,
          jsonLdScripts: jsonLdScripts.length,
          metaTags: metaTags.length,
        });

        // Metadata parsing complete - update immediately
        updateProgress("metadata", 1);
        updateProgress("dataFeeds", 0.5);
        updateData({ metadata });

        const robotsTxtContent =
          robotsTxtResult.status === "fulfilled" &&
          robotsTxtResult.value?.exists &&
          typeof robotsTxtResult.value.content === "string"
            ? robotsTxtResult.value.content
            : null;

        const contentSignals = robotsTxtContent ? parseContentSignals(robotsTxtContent) : undefined;
        const paymentSignals = detectPaymentSignals(status, headers);
        log.log("parse:payment-signals", {
          detected: paymentSignals?.detected ?? false,
          statusCode402: paymentSignals?.statusCode402 ?? false,
          paymentRequired: paymentSignals?.paymentRequired ?? false,
          paymentResponse: paymentSignals?.paymentResponse ?? false,
        });

        const discoverability: DiscoverabilityData = {
          robots: $('meta[name="robots"]').attr("content"),
          robotsTxt:
            robotsTxtResult.status === "fulfilled" && !!robotsTxtResult.value && robotsTxtResult.value.exists === true,
          canonical: $('link[rel="canonical"]').attr("href"),
          sitemap:
            sitemapResult.status === "fulfilled" &&
            sitemapResult.value &&
            sitemapResult.value.status >= 200 &&
            sitemapResult.value.status < 300
              ? sitemapUrl
              : undefined,
          llmsTxt: llmsTxtResult.status === "fulfilled" && !!llmsTxtResult.value && llmsTxtResult.value.exists === true,
          contentSignals,
          paymentSignals,
        };

        // Collect alternates, excluding feed types (those go to DataFeedsData)
        const feedMimeTypes = [
          "application/rss+xml",
          "application/atom+xml",
          "application/json",
          "application/feed+json",
        ];
        const alternates: Array<{ href: string; hreflang?: string; type?: string }> = [];
        $('link[rel="alternate"]').each((_, el) => {
          const href = $(el).attr("href");
          const type = $(el).attr("type");
          // Skip feed types - they're handled separately in DataFeedsData
          if (href && !feedMimeTypes.includes(type || "")) {
            alternates.push({
              href,
              hreflang: $(el).attr("hreflang"),
              type,
            });
          }
        });
        if (alternates.length > 0) {
          discoverability.alternates = alternates;
        }

        // Discoverability parsing complete - update immediately
        updateProgress("discoverability", 1);
        updateData({ discoverability });

        const stylesheets: Array<{ href: string; media?: string }> = [];
        $('link[rel="stylesheet"]')
          .slice(0, LIMITS.MAX_RESOURCES)
          .each((_, el) => {
            const href = $(el).attr("href");
            if (href) {
              stylesheets.push({
                href,
                media: $(el).attr("media"),
              });
            }
          });

        const scripts: Array<{ src: string; async?: boolean; defer?: boolean; type?: string }> = [];
        $("script[src]")
          .slice(0, LIMITS.MAX_RESOURCES)
          .each((_, el) => {
            const src = $(el).attr("src");
            if (src) {
              scripts.push({
                src,
                async: $(el).attr("async") !== undefined,
                defer: $(el).attr("defer") !== undefined,
                type: $(el).attr("type"),
              });
            }
          });

        // Comprehensive image extraction from multiple sources
        const images: ImageAsset[] = [];
        const resolveUrl = (url: string) => {
          if (!url) return "";
          try {
            return url.startsWith("http") ? url : new URL(url, normalizedUrl).href;
          } catch {
            return url;
          }
        };

        // 1. Favicon and icon links
        $('link[rel*="icon"]').each((_, el) => {
          const href = $(el).attr("href");
          const rel = $(el).attr("rel") || "";
          if (href) {
            let type: ImageAsset["type"] = "favicon";
            if (rel.includes("apple-touch-icon")) {
              type = "apple-touch-icon";
            } else if (rel.includes("mask-icon")) {
              type = "mask-icon";
            }
            images.push({
              src: resolveUrl(href),
              type,
              sizes: $(el).attr("sizes"),
              mimeType: $(el).attr("type"),
            });
          }
        });

        // 3. Open Graph images
        $('meta[property="og:image"], meta[property="og:image:url"]').each((_, el) => {
          const content = $(el).attr("content");
          if (content) {
            images.push({
              src: resolveUrl(content),
              type: "og",
            });
          }
        });

        // 4. Twitter Card images
        $('meta[name="twitter:image"], meta[name="twitter:image:src"], meta[name="twitter:player:image"]').each(
          (_, el) => {
            const content = $(el).attr("content");
            if (content) {
              images.push({
                src: resolveUrl(content),
                type: "twitter",
              });
            }
          },
        );

        // 5. Microsoft application tile image
        $('meta[name="msapplication-TileImage"]').each((_, el) => {
          const content = $(el).attr("content");
          if (content) {
            images.push({
              src: resolveUrl(content),
              type: "msapplication",
            });
          }
        });

        // 6. JSON-LD structured data images
        if (jsonLdScripts.length > 0) {
          const extractJsonLdImages = (obj: unknown, depth = 0): void => {
            if (depth > 5 || !obj || typeof obj !== "object") return;
            const record = obj as Record<string, unknown>;

            // Check for image properties
            const imageProps = ["image", "logo", "thumbnailUrl", "photo"];
            for (const prop of imageProps) {
              const value = record[prop];
              if (typeof value === "string") {
                images.push({ src: resolveUrl(value), type: "json-ld" });
              } else if (Array.isArray(value)) {
                for (const item of value) {
                  if (typeof item === "string") {
                    images.push({ src: resolveUrl(item), type: "json-ld" });
                  } else if (item && typeof item === "object" && "url" in item) {
                    const url = (item as Record<string, unknown>).url;
                    if (typeof url === "string") {
                      images.push({ src: resolveUrl(url), type: "json-ld" });
                    }
                  }
                }
              } else if (value && typeof value === "object" && "url" in value) {
                const url = (value as Record<string, unknown>).url;
                if (typeof url === "string") {
                  images.push({ src: resolveUrl(url), type: "json-ld" });
                }
              }
            }

            // Recurse into nested objects
            for (const key of Object.keys(record)) {
              if (record[key] && typeof record[key] === "object") {
                extractJsonLdImages(record[key], depth + 1);
              }
            }
          };

          for (const ld of jsonLdScripts) {
            extractJsonLdImages(ld);
          }
        }

        // 7. Extract theme-color
        const themeColor = $('meta[name="theme-color"]').attr("content");

        // 8. Fetch and parse manifest.json for PWA icons, screenshots, and shortcuts
        const manifestHref = $('link[rel="manifest"]').attr("href");
        if (manifestHref) {
          const manifestUrl = resolveUrl(manifestHref);
          try {
            const manifestResult = await fetchTextResource(manifestUrl);
            if (manifestResult.exists && manifestResult.content) {
              const manifest = JSON.parse(manifestResult.content);
              log.log("parse:manifest", {
                url: manifestUrl,
                hasIcons: !!manifest.icons,
                hasScreenshots: !!manifest.screenshots,
                hasShortcuts: !!manifest.shortcuts,
              });

              // Extract icons from manifest
              if (Array.isArray(manifest.icons)) {
                for (const icon of manifest.icons) {
                  if (icon.src) {
                    images.push({
                      src: resolveUrl(icon.src),
                      type: "manifest-icon",
                      sizes: icon.sizes,
                      mimeType: icon.type,
                    });
                  }
                }
              }

              // Extract screenshots from manifest
              if (Array.isArray(manifest.screenshots)) {
                for (const screenshot of manifest.screenshots) {
                  if (screenshot.src) {
                    images.push({
                      src: resolveUrl(screenshot.src),
                      type: "manifest-screenshot",
                      sizes: screenshot.sizes,
                      mimeType: screenshot.type,
                      alt: screenshot.label,
                    });
                  }
                }
              }

              // Extract shortcut icons from manifest
              if (Array.isArray(manifest.shortcuts)) {
                for (const shortcut of manifest.shortcuts) {
                  if (Array.isArray(shortcut.icons)) {
                    for (const icon of shortcut.icons) {
                      if (icon.src) {
                        images.push({
                          src: resolveUrl(icon.src),
                          type: "manifest-shortcut",
                          sizes: icon.sizes,
                          mimeType: icon.type,
                          alt: shortcut.name,
                        });
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            // `warn`, not `log`: the manifest was advertised by the page and we
            // failed to use it, so icons/metadata are silently missing from the
            // result. That degradation is invisible in the UI, which makes it
            // exactly the thing a bug report needs to carry.
            //
            // Query string stripped because warn is not verbose-gated — see
            // redactUrlForLog.
            log.warn("parse:manifest-error", {
              url: redactUrlForLog(manifestUrl),
              error: e instanceof Error ? e.message : "unknown",
            });
          }
        }

        const links: Array<{ href: string; rel?: string }> = [];
        $('link[rel]:not([rel="stylesheet"]):not([rel="alternate"])')
          .slice(0, LIMITS.MAX_RESOURCES)
          .each((_, el) => {
            const href = $(el).attr("href");
            if (href) {
              links.push({
                href,
                rel: $(el).attr("rel"),
              });
            }
          });

        // 8. Extract fonts from various sources
        const fonts: FontAsset[] = [];
        log.log("parse:fonts:start", { url: normalizedUrl });

        // 8a. Parse @font-face from inline <style> tags (most reliable source)
        const inlineStyles = extractInlineStyles(streamedHtml);
        for (const styleContent of inlineStyles) {
          const inlineFonts = parseFontFaceFromCSS(styleContent, normalizedUrl);
          fonts.push(...inlineFonts);
        }
        log.log("parse:fonts:inline-styles", {
          styleCount: inlineStyles.length,
          fontsFound: fonts.length,
        });

        // 8b. Google Fonts, Bunny Fonts, Adobe Fonts from stylesheet links
        $('link[rel="stylesheet"]').each((_, el) => {
          const href = $(el).attr("href");
          if (href) {
            const resolvedUrl = resolveUrl(href);
            const parsedFonts = parseFontsFromUrl(resolvedUrl);
            fonts.push(...parsedFonts);
          }
        });

        // 8c. Font preload links (fallback if @font-face not found)
        $('link[rel="preload"][as="font"]').each((_, el) => {
          const href = $(el).attr("href");
          if (href) {
            const resolvedUrl = resolveUrl(href);
            const type = $(el).attr("type");
            fonts.push(extractPreloadFont(resolvedUrl, type));
          }
        });

        // 8d. Check scripts for Adobe Fonts/Typekit
        $("script[src]").each((_, el) => {
          const src = $(el).attr("src");
          if (src) {
            const resolvedUrl = resolveUrl(src);
            const parsedFonts = parseFontsFromUrl(resolvedUrl);
            fonts.push(...parsedFonts);
          }
        });

        // Deduplicate fonts
        const deduplicatedFonts = deduplicateFonts(fonts);
        log.log("parse:fonts:complete", {
          rawCount: fonts.length,
          deduplicatedCount: deduplicatedFonts.length,
          fonts: deduplicatedFonts.map((f) => ({
            family: f.family,
            variants: f.variants,
            format: f.format,
            provider: f.provider,
          })),
        });

        // Extract feed URLs
        const rssFeeds: Array<{ url: string; title?: string }> = [];
        const atomFeeds: Array<{ url: string; title?: string }> = [];
        const jsonFeeds: Array<{ url: string; title?: string }> = [];

        $('link[type="application/rss+xml"]').each((_, el) => {
          const href = $(el).attr("href");
          const title = $(el).attr("title");
          if (href) {
            rssFeeds.push({ url: href.startsWith("http") ? href : new URL(href, normalizedUrl).href, title });
          }
        });

        $('link[type="application/atom+xml"]').each((_, el) => {
          const href = $(el).attr("href");
          const title = $(el).attr("title");
          if (href) {
            atomFeeds.push({ url: href.startsWith("http") ? href : new URL(href, normalizedUrl).href, title });
          }
        });

        $('link[type="application/json"], link[type="application/feed+json"]').each((_, el) => {
          const href = $(el).attr("href");
          const title = $(el).attr("title");
          if (href) {
            jsonFeeds.push({ url: href.startsWith("http") ? href : new URL(href, normalizedUrl).href, title });
          }
        });

        // Build resources and dataFeeds objects once for reuse
        const resources = {
          stylesheets: stylesheets.length > 0 ? stylesheets : undefined,
          scripts: scripts.length > 0 ? scripts : undefined,
          images: images.length > 0 ? images : undefined,
          links: links.length > 0 ? links : undefined,
          themeColor,
          fonts: deduplicatedFonts.length > 0 ? deduplicatedFonts : undefined,
        };

        const dataFeeds =
          rssFeeds.length > 0 || atomFeeds.length > 0 || jsonFeeds.length > 0
            ? {
                rss: rssFeeds.length > 0 ? rssFeeds : undefined,
                atom: atomFeeds.length > 0 ? atomFeeds : undefined,
                json: jsonFeeds.length > 0 ? jsonFeeds : undefined,
              }
            : undefined;

        // Resources and data feeds parsing complete - update immediately
        updateProgress("resources", 1);
        updateProgress("dataFeeds", 1);
        updateData({ resources, dataFeeds });

        log.log("fetch:awaiting-async-fetches", { hostname });

        // Now await the async fetches that were started earlier
        // Handle each one individually so they update as they complete
        // Each handler bails if a newer fetch has taken over. updateProgress and
        // updateData are already guarded, but returning here also suppresses the
        // "*-complete" logs — which would otherwise claim a cancelled fetch
        // finished — and covers setCertificateInfo/setData, which write directly.
        dnsPromise.then((dnsData) => {
          if (isSuperseded()) return;
          log.log("fetch:dns-complete", { hasDns: !!dnsData });
          updateProgress("dns", 1);
          updateData({ dns: dnsData });
        });

        certPromise.then((certInfo) => {
          if (isSuperseded()) return;
          log.log("fetch:cert-complete", { hasCert: !!certInfo });
          if (certInfo) {
            setCertificateInfo(certInfo);
          }
        });

        waybackPromise.then((waybackData) => {
          if (isSuperseded()) return;
          log.log("fetch:wayback-complete", { hasWayback: !!waybackData, rateLimited: waybackData?.rateLimited });
          updateProgress("history", 1);
          // Only update if we got good data, or if there's no existing data
          // Don't overwrite good cached data with rate-limited empty data
          if (waybackData && !waybackData.rateLimited) {
            updateData({ history: waybackData });
          } else if (waybackData?.rateLimited) {
            // If rate limited, update to show the rate limit status but preserve any existing snapshot data
            setData((prev) => {
              if (prev?.history?.waybackMachineSnapshots && prev.history.waybackMachineSnapshots > 0) {
                // Keep existing good data, just add rate limited flag
                return { ...prev, history: { ...prev.history, rateLimited: true } };
              }
              // No existing good data, show rate limited state
              return prev ? { ...prev, history: waybackData } : prev;
            });
          }
        });

        hostMetaPromise.then((hostMetadata) => {
          if (isSuperseded()) return;
          log.log("fetch:hostmeta-complete", { hasHostMeta: !!hostMetadata?.available });
          updateData({ hostMetadata });
        });

        // Wait for all async fetches to complete before caching
        const [dnsData, certInfo, waybackData, hostMetadata] = await Promise.all([
          dnsPromise,
          certPromise,
          waybackPromise,
          hostMetaPromise,
        ]);

        log.log("fetch:all-async-complete", {
          hasDns: !!dnsData,
          hasCert: !!certInfo,
          hasWayback: !!waybackData,
          hasHostMeta: !!hostMetadata?.available,
          waybackRateLimited: waybackData?.rateLimited,
        });

        // Determine final history data - don't cache rate-limited empty data over good data
        let finalHistoryData = waybackData;
        if (
          waybackData?.rateLimited &&
          (!waybackData.waybackMachineSnapshots || waybackData.waybackMachineSnapshots === 0)
        ) {
          // Rate limited with no data - check if we have existing good data in state
          const currentData = data;
          if (currentData?.history?.waybackMachineSnapshots && currentData.history.waybackMachineSnapshots > 0) {
            // Preserve existing good data, just mark as rate limited
            finalHistoryData = { ...currentData.history, rateLimited: true };
            log.log("fetch:wayback-preserving-cached", {
              existingSnapshots: currentData.history.waybackMachineSnapshots,
            });
          }
        }

        // Build final result for caching
        const result: DiggerResult = {
          url: normalizedUrl,
          overview,
          metadata,
          discoverability,
          botProtection,
          resources,
          networking: {
            statusCode: status,
            headers,
            finalUrl,
            server: headers.server,
          },
          dns: dnsData,
          performance: {
            loadTime: timing,
            pageSize: streamedHtml.length,
          },
          history: finalHistoryData,
          dataFeeds,
          hostMetadata,
          fetchedAt: Date.now(),
        };

        // Final update and cache
        //
        // Guarded for TWO distinct reasons, and the cache one is the subtle half.
        // `setData` would paint this fetch's result over the newer one. But
        // `saveToCache` is worse than useless on a superseded fetch: abort makes
        // every withAbort() wrapper resolve with its FALLBACK, so `result` here
        // carries undefined dns/cert/wayback/hostMetadata. Persisting that writes
        // a hole-ridden entry under this URL's key, and the next dig of this very
        // URL would score a cache hit and render the gaps as fact.
        if (isSuperseded()) {
          log.log("fetch:superseded", { url: normalizedUrl, at: "final-write" });
          return;
        }
        setData(result);
        // The predicate is re-checked inside, after eviction — passing the guard
        // above only proves we were current when the write STARTED.
        await saveToCache(normalizedUrl, result, isSuperseded);
        log.log("fetch:complete", { url: normalizedUrl });
      } catch (err) {
        // Say nothing if a newer dig owns the view — whether it cancelled us or we
        // failed on our own. Ownership, not the abort signal: our own
        // failure-abort flips that signal too, and reading it here is what used to
        // swallow genuine errors.
        if (!ownsView()) {
          log.log("fetch:aborted", { targetUrl });
          return;
        }

        const classified = classifyError(err);
        log.error("fetch:error", { error: classified.message, type: classified.type });
        // Ensure async operations are cancelled on any error.
        abortController.abort();
        setError(classified.message);
        setErrorType(classified.type);
        addFetchError("main", err, classified.recoverable);
        // The toast is where a Raycast user reaches for the error — not the
        // action panel behind ⌘K — so its Copy Error yields the SAME full report
        // the empty state's does, not just the summary line. Both call
        // buildErrorReport, so they cannot drift apart.
        const report = buildErrorReport({
          errorType: classified.type,
          message: classified.message,
          url: targetUrl,
          causes: [{ description: getCategoryDescription("main"), message: errorDetail(err) }],
        });
        // First argument is the REPORT, not the summary. showFailureToast injects
        // its own secondary action whenever a primary is supplied, and that
        // secondary only ever sees this first argument — so passing the summary
        // here gave the built-in action a single line while ours had the full
        // detail. `message` below keeps the on-screen text short regardless.
        await showFailureToast(report, {
          message: classified.message,
          // Was hardcoded "Fetch Error" while the card said "Connection Failed" —
          // the same failure named two different things on one screen.
          title: getErrorTitle(classified.type),
          primaryAction: {
            title: "Copy Error",
            shortcut: { macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } },
            onAction: (toast: Toast) => {
              Clipboard.copy(report);
              toast.hide();
            },
          },
        });
      } finally {
        // Clear the spinner only while we still own it. A Retry started during
        // the `await showFailureToast` above sets its own spinner, and this
        // `finally` then runs — so "did I abort myself?" is the wrong question
        // here; "am I still the current fetch?" is the right one.
        if (ownsView()) {
          setIsLoading(false);
        }
      }
    },
    [getFromCache, saveToCache],
  );

  const refetch = useCallback(() => {
    if (url) {
      fetchSite(url);
    }
  }, [url, fetchSite]);

  return { data, isLoading, error, errorType, fetchErrors, refetch, fetchSite, certificateInfo, progress };
}
