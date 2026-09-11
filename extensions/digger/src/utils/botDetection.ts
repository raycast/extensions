import { getLogger } from "./logger";

const log = getLogger("botDetection");

/**
 * Detection patterns for various bot protection services
 */
interface DetectionPattern {
  /** Provider identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Server header patterns (case-insensitive) */
  serverHeaders?: RegExp[];
  /** Title patterns that indicate a challenge page */
  challengeTitles?: RegExp[];
  /** HTML content patterns */
  htmlPatterns?: RegExp[];
  /** Cookie patterns */
  cookiePatterns?: RegExp[];
  /** Status codes that commonly indicate blocking */
  blockingStatusCodes?: number[];
}

const DETECTION_PATTERNS: DetectionPattern[] = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    serverHeaders: [/^cloudflare$/i],
    challengeTitles: [
      /^just a moment\.{0,3}$/i,
      /^attention required/i,
      /^please wait\.{0,3}$/i,
      /^checking your browser/i,
    ],
    htmlPatterns: [
      /cf-browser-verification/i,
      /cf_chl_opt/i,
      /__cf_chl_rt_tk/i,
      /challenge-platform/i,
      /cdn-cgi\/challenge-platform/i,
    ],
    blockingStatusCodes: [403, 503],
  },
  {
    id: "akamai",
    name: "Akamai",
    serverHeaders: [/^akamai/i, /^akamaighost/i],
    challengeTitles: [/^access denied/i, /^request rejected/i],
    htmlPatterns: [/akamai/i, /ak_bmsc/i],
    blockingStatusCodes: [403],
  },
  {
    id: "aws-waf",
    name: "AWS WAF",
    serverHeaders: [/^awselb/i, /^amazons3/i],
    challengeTitles: [/^error$/i, /^403 forbidden$/i],
    htmlPatterns: [/aws-waf-token/i, /captcha\.awswaf/i],
    blockingStatusCodes: [403],
  },
  {
    id: "sucuri",
    name: "Sucuri",
    serverHeaders: [/^sucuri/i],
    challengeTitles: [/^sucuri website firewall/i, /^access denied/i],
    htmlPatterns: [/sucuri/i, /cloudproxy/i],
    blockingStatusCodes: [403],
  },
  {
    id: "imperva",
    name: "Imperva/Incapsula",
    serverHeaders: [/^incapsula/i],
    challengeTitles: [/^request unsuccessful/i, /^pardon our interruption/i],
    htmlPatterns: [/incapsula/i, /_incap_/i, /visid_incap/i],
    blockingStatusCodes: [403],
  },
  {
    id: "ddos-guard",
    name: "DDoS-Guard",
    serverHeaders: [/^ddos-guard/i],
    challengeTitles: [/^ddos-guard/i],
    htmlPatterns: [/ddos-guard/i],
    blockingStatusCodes: [403, 503],
  },
  {
    id: "generic",
    name: "Bot Protection",
    challengeTitles: [
      /^access denied$/i,
      /^forbidden$/i,
      /^blocked$/i,
      /^please verify/i,
      /^human verification/i,
      /^are you a robot/i,
      /^captcha/i,
    ],
    blockingStatusCodes: [403, 429, 503],
  },
];

export interface DetectionInput {
  /** HTTP status code */
  statusCode: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Page title extracted from HTML */
  title?: string;
  /** Raw HTML content (optional, for deeper analysis) */
  html?: string;
}

export interface DetectionResult {
  detected: boolean;
  provider?: string;
  providerName?: string;
  isChallengePage: boolean;
  confidence: number;
}

/**
 * Detects bot protection/WAF based on response characteristics
 */
export function detectBotProtection(input: DetectionInput): DetectionResult {
  const { statusCode, headers, title, html } = input;
  const serverHeader = headers.server || headers.Server || "";

  let bestMatch: { pattern: DetectionPattern; confidence: number; isChallenge: boolean } | null = null;

  for (const pattern of DETECTION_PATTERNS) {
    let confidence = 0;
    let isChallenge = false;

    // Check server header
    if (pattern.serverHeaders) {
      for (const regex of pattern.serverHeaders) {
        if (regex.test(serverHeader)) {
          confidence += 0.3;
          break;
        }
      }
    }

    // Check if status code indicates blocking
    if (pattern.blockingStatusCodes?.includes(statusCode)) {
      confidence += 0.2;
    }

    // Check title for challenge page indicators
    if (title && pattern.challengeTitles) {
      for (const regex of pattern.challengeTitles) {
        if (regex.test(title.trim())) {
          confidence += 0.4;
          isChallenge = true;
          break;
        }
      }
    }

    // Check HTML content for patterns
    if (html && pattern.htmlPatterns) {
      for (const regex of pattern.htmlPatterns) {
        if (regex.test(html)) {
          confidence += 0.2;
          isChallenge = true;
          break;
        }
      }
    }

    // Update best match if this is better
    if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { pattern, confidence, isChallenge };
    }
  }

  if (bestMatch && bestMatch.confidence >= 0.4) {
    log.log("detected", {
      provider: bestMatch.pattern.id,
      confidence: bestMatch.confidence,
      isChallenge: bestMatch.isChallenge,
      statusCode,
      title,
    });

    return {
      detected: true,
      provider: bestMatch.pattern.id,
      providerName: bestMatch.pattern.name,
      isChallengePage: bestMatch.isChallenge,
      confidence: Math.min(bestMatch.confidence, 1),
    };
  }

  return {
    detected: false,
    isChallengePage: false,
    confidence: 0,
  };
}

/**
 * Returns a user-friendly message for denied access
 */
export function getDeniedAccessMessage(provider?: string): string {
  if (provider) {
    const pattern = DETECTION_PATTERNS.find((p) => p.id === provider);
    if (pattern) {
      return `Access denied by ${pattern.name}`;
    }
  }
  return "Access denied";
}
