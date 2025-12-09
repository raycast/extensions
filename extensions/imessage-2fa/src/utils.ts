import { LookBackUnitType } from "./types";

/**
 * Regex pattern to extract printable text sequences from binary NSArchiver data
 * Matches sequences of 10+ printable characters including:
 * - ASCII printable characters (0x20-0x7E)
 * - Extended Latin (0xA0-0xFF)
 * - Unicode letters, numbers, punctuation, symbols, and emoji
 * Uses Unicode property escapes to match all printable Unicode characters
 */
const PRINTABLE_TEXT_REGEX = /[\p{L}\p{N}\p{P}\p{S}\p{Zs}]{10,}/gu;

/**
 * try to extract iMessage 2FA Code, empty result if not found any code
 *
 * @param original - original message text from iMessage
 * @returns
 * @see https://github.com/squatto/alfred-imessage-2fa/blob/master/find-messages.php
 */
export function extractCode(original: string): string | null {
  // Check for undefined or null input
  // This prevents 'replaceAll' errors when processing messages with missing displayText
  if (!original) {
    return null;
  }

  // remove URLs
  const urlRegex = new RegExp(
    "\\b((https?|ftp|file):\\/\\/|www\\.)[-A-Z0-9+&@#\\/%?=~_|$!:,.;]*[A-Z0-9+&@#\\/%=~_|$]",
    "ig"
  );
  let message = original.replaceAll(urlRegex, "");

  if (message.trim() === "") return null;

  let m;
  let code;

  // Look for specific patterns first
  if ((m = /^(\d{4,8})(\sis your.*code)/.exec(message)) !== null) {
    code = m[1];
  } else if (
    // Look for the last occurrence of "code: DIGITS" pattern
    // This helps with cases like "test code: test code: 883848" where we want the last match
    (m =
      /(code\s*:|is\s*:|码|use code|passcode\s*:|autoriza(?:ca|çã)o\s*:|c(?:o|ó)digo\s*:)\s*(\d{4,8})($|\s|\\R|\t|\b|\.|,)/i.exec(
        message
      )) !== null
  ) {
    // Use the helper function to find the last match
    code = findLastMatchingCode(
      message,
      m,
      /(code\s*:|is\s*:|码|use code|passcode\s*:|autoriza(?:ca|çã)o\s*:|c(?:o|ó)digo\s*:)\s*(\d{4,8})($|\s|\\R|\t|\b|\.|,)/i
    );
  } else if (
    // Modified to match alphanumeric codes
    (m =
      /(code\s*:|is\s*:|码|use code|passcode\s*:|autoriza(?:ca|çã)o\s*:|c(?:o|ó)digo\s*:)\s*([A-Z0-9]{4,8})($|\s|\\R|\t|\b|\.|,)/i.exec(
        message
      )) !== null
  ) {
    // Use the helper function to find the last match
    code = findLastMatchingCode(
      message,
      m,
      /(code\s*:|is\s*:|码|use code|passcode\s*:|autoriza(?:ca|çã)o\s*:|c(?:o|ó)digo\s*:)\s*([A-Z0-9]{4,8})($|\s|\\R|\t|\b|\.|,)/i
    );
  } else {
    // more generic, brute force patterns
    const phoneRegex = new RegExp(
      /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/,
      "ig"
    );

    message = message.replaceAll(phoneRegex, "");

    if ((m = /(^|\s|\\R|\t|\b|G-|:)(\d{5,8})($|\s|\\R|\t|\b|\.|,)/.exec(message)) !== null) {
      code = m[2];
    } else if ((m = /\b(?=[A-Z]*[0-9])(?=[0-9]*[A-Z])[0-9A-Z]{3,8}\b/.exec(message)) !== null) {
      code = m[0];
    } else if ((m = /(^|code:|is:|\b)\s*(\d{3})-(\d{3})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
      const first = m[2];
      const second = m[3];
      code = `${first}${second}`;
    } else if ((m = /(code|is):?\s*(\d{3,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
      code = m[2];
    }
  }

  return code || null;
}

/**
 * Simple utility to remove HTML tags from a string.
 *
 * @param html - String containing HTML
 * @returns String with HTML tags removed
 */
export function stripHtmlTags(html: string): string {
  // Decode common HTML entities first
  let text = html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  // Replace <br> tags with newlines for better readability
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Remove all other HTML tags
  text = text.replace(/<[^>]*>/g, "");
  // Trim whitespace
  return text.trim();
}

// Helper function to decode common HTML entities
function decodeUrlEntities(url: string): string {
  return url
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Fix quoted-printable encoded URLs
 * Apple Mail often breaks URLs due to quoted-printable encoding
 * This fixes URLs like "https://grand-feline-95.cl=" to proper form
 *
 * Note: We only decode quoted-printable at the end of URLs (trailing =)
 * Regular = signs in URL parameters should NOT be decoded as they're not quoted-printable
 */
function fixQuotedPrintableUrl(url: string): string {
  if (!url) return url;

  // Handle the specific case where a URL is cut off with an equal sign
  // This is a quoted-printable line continuation marker
  if (url.endsWith("=")) {
    // Remove trailing equals sign that's part of quoted-printable line continuation
    url = url.slice(0, -1);
  }

  // Only decode quoted-printable encoding that appears at the end of URL segments
  // (after / or ? or &), not regular = signs in parameter values
  // This pattern matches =XX only when it's followed by a non-hex character or end of string
  // and preceded by a delimiter, to avoid corrupting regular URL parameters
  // Actually, we should be more conservative - only decode if it's clearly quoted-printable
  // For now, don't decode embedded =XX patterns as they're likely regular URL parameters
  return url;
}

/**
 * Extract verification or sign-in links from messages
 *
 * @param message - Original message text (should be decoded by caller, but we decode again just in case)
 * @returns Object with the link URL and type if found, null otherwise
 */
export function extractVerificationLink(message: string): { url: string; type: "verification" | "sign-in" } | null {
  // Decode entities in the entire message first to handle escaped HTML structure
  const processedMessage = decodeUrlEntities(message);

  // Regex to find HTML anchor tags with their content
  const anchorTagRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
  const linkCandidates: { url: string; text: string; type: "verification" | "sign-in" | "unknown" }[] = [];

  // Keywords for classification
  const verificationKeywords = [
    // English
    "verify",
    "confirm",
    "activate",
    "validate",
    "token=",
    "auth=", // URL patterns
    "verification",
    "confirmation",
    "activation",
    "confirm account",
    "verification link",
    "confirmation link",
    "activate link",
    // German
    "bestätigen",
    "bestätigung",
    "aktivierungslink",
    "e-mail-adresse bestätigen",
    // Spanish
    "verificar",
    "confirmar",
    "activar",
    "validar",
    "verificación",
    "confirmación",
    "activación",
    "verificar cuenta",
    "confirmar cuenta",
    "activar cuenta",
    "enlace de verificación",
    "enlace de activación",
    // French
    "vérifier",
    "confirmer",
    "activer",
    "valider",
    "vérification",
    "confirmation",
    "activation",
    "vérifier votre compte",
    "confirmer votre compte",
    "activer votre compte",
    "lien de vérification",
    "lien d'activation",
  ];
  const signInKeywords = [
    // English
    "sign in",
    "log in",
    "signin",
    "login",
    "authenticate",
    "magic link",
    "one-time link",
    "passwordless",
    "access account",
    "access", // For URLs like /temp-access, /access, etc.
    // Spanish
    "iniciar sesión",
    "entrar",
    "acceder",
    "enlace de inicio de sesión",
    "enlace mágico",
    // French
    "se connecter",
    "connexion",
    "accéder", // Note: accéder shared with Spanish
    "lien de connexion",
    "lien magique", // Note: lien magique shared with Spanish
  ];

  // Common non-actionable URLs to ignore
  const ignoreUrls = [
    "http://www.w3.org/1999/xhtml",
    // Add other common non-links if needed
  ];

  // 1. Check HTML anchor tags first (most reliable context)
  if (processedMessage.includes("<a href=")) {
    const anchorMatches = [...processedMessage.matchAll(anchorTagRegex)];
    for (const match of anchorMatches) {
      const rawUrl = fixQuotedPrintableUrl(match[2]); // Fix potential QP issues

      // Skip ignored URLs
      if (ignoreUrls.includes(rawUrl)) continue;

      const linkText = stripHtmlTags(match[3]).toLowerCase(); // Cleaned text inside the tag
      const lowerUrl = rawUrl.toLowerCase();

      let type: "verification" | "sign-in" | "unknown" = "unknown";

      // A. Classify based on link text content
      if (signInKeywords.some((keyword) => linkText.includes(keyword))) {
        type = "sign-in";
      } else if (verificationKeywords.some((keyword) => linkText.includes(keyword))) {
        type = "verification";
      }

      // B. If text is ambiguous, classify based on URL content
      if (type === "unknown") {
        // Check sign-in keywords FIRST (they take priority when URL contains both)
        if (signInKeywords.some((keyword) => lowerUrl.includes(keyword))) {
          // Refine Google link detection
          if (
            lowerUrl.includes("accounts.google.com") &&
            !(lowerUrl.includes("token=") || lowerUrl.includes("/signin") || lowerUrl.includes("challenge"))
          ) {
            // Skip generic google links, keep type as 'unknown'
          } else {
            type = "sign-in";
          }
        }
        // Then check for specific patterns like token/auth for verification
        else if (
          verificationKeywords.some(
            (keyword) => lowerUrl.includes(keyword) && (keyword === "token=" || keyword === "auth=")
          )
        ) {
          type = "verification";
        }
        // Then check general verification keywords in URL
        else if (verificationKeywords.some((keyword) => lowerUrl.includes(keyword))) {
          // Refine Google link detection (avoid generic account links)
          if (
            lowerUrl.includes("accounts.google.com") &&
            !(
              lowerUrl.includes("token=") ||
              lowerUrl.includes("verify") ||
              lowerUrl.includes("/signin/v2/challenge") ||
              lowerUrl.includes("otac")
            )
          ) {
            // Skip generic google links, keep type as 'unknown'
          } else {
            type = "verification";
          }
        }
      }

      if (type !== "unknown") {
        linkCandidates.push({ url: rawUrl, text: linkText, type });
      }
    }

    // If we found classified links via anchor tags, return the best one
    // Prioritize sign-in slightly, then verification
    const firstSignIn = linkCandidates.find((c) => c.type === "sign-in");
    if (firstSignIn) return { url: firstSignIn.url, type: "sign-in" };
    const firstVerification = linkCandidates.find((c) => c.type === "verification");
    if (firstVerification) return { url: firstVerification.url, type: "verification" };
    // If only unknown links found in tags, DO NOT proceed to general checks yet
    // We rely on explicit classification within <a> tags if they exist.
    if (anchorMatches.length > 0) {
      return null; // Found <a> tags but couldn't classify any, don't fall back to loose matching
    }
  }

  // 2. ONLY If NO reliable <a> tags were found/classified, check for general URLs in the text body
  //    using keywords in the URL itself as the primary driver (less reliant on surrounding text).
  const urlRegex = /https?:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]*[-A-Za-z0-9+&@#%=~_|]/gi;
  const urlMatches = [...processedMessage.matchAll(urlRegex)];
  if (urlMatches.length === 0) return null;

  const generalLinkCandidates: { url: string; type: "verification" | "sign-in" }[] = [];

  for (const match of urlMatches) {
    const rawUrl = fixQuotedPrintableUrl(match[0]); // Fix potential QP issues
    const lowerUrl = rawUrl.toLowerCase();

    // Skip ignored URLs
    if (ignoreUrls.some((ignore) => rawUrl.startsWith(ignore))) continue;

    // Check for verification/sign-in keywords *within the URL itself*
    let type: "verification" | "sign-in" | "unknown" = "unknown";

    // Check sign-in keywords FIRST (they take priority when URL contains both)
    if (signInKeywords.some((keyword) => lowerUrl.includes(keyword))) {
      // Refine Google link detection
      if (
        lowerUrl.includes("accounts.google.com") &&
        !(lowerUrl.includes("token=") || lowerUrl.includes("/signin") || lowerUrl.includes("challenge"))
      ) {
        // Skip generic google links
      } else {
        type = "sign-in";
      }
    }
    // Check verification keywords in URL if not already classified
    else if (verificationKeywords.some((keyword) => lowerUrl.includes(keyword))) {
      // Refine Google link detection
      if (
        lowerUrl.includes("accounts.google.com") &&
        !(
          lowerUrl.includes("token=") ||
          lowerUrl.includes("verify") ||
          lowerUrl.includes("/signin/v2/challenge") ||
          lowerUrl.includes("otac")
        )
      ) {
        // Skip generic google links
      } else {
        type = "verification";
      }
    }

    if (type !== "unknown") {
      generalLinkCandidates.push({ url: rawUrl, type: type });
    }
  }

  // Return the first classified general URL found (prioritize sign-in slightly)
  const firstGeneralSignIn = generalLinkCandidates.find((c) => c.type === "sign-in");
  if (firstGeneralSignIn) return { url: firstGeneralSignIn.url, type: "sign-in" };
  const firstGeneralVerification = generalLinkCandidates.find((c) => c.type === "verification");
  if (firstGeneralVerification) return { url: firstGeneralVerification.url, type: "verification" };

  return null; // No verifiable link found
}

// This object maps each unit of time to the number of minutes it contains.
const unitToMinutesMap: { [unit in LookBackUnitType]: number } = {
  DAYS: 24 * 60,
  HOURS: 60,
  MINUTES: 1,
};

/**
 * Calculates the total minutes based on a specified look back unit and amount.
 *
 * @param lookBackUnit - The time unit ('DAYS', 'HOURS', 'MINUTES') for the look back period.
 * @param lookBackAmount - The quantity of the specified unit, defaults to 1.
 * @returns The total minutes for the look back period. Returns 10 for unrecognized units.
 */
export function calculateLookBackMinutes(lookBackUnit: LookBackUnitType, lookBackAmount = 1): number {
  const unitMinutes = unitToMinutesMap[lookBackUnit] || 1;
  return unitMinutes * lookBackAmount;
}

/**
 * Format a date using the system's locale settings
 * @param date The date to format
 * @returns A localized date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleString();
}

/**
 * Extract plain text from iMessage NSArchiver/NSKeyedArchiver binary format
 *
 * When iMessage stores rich text messages (especially with 2FA codes), it uses
 * NSAttributedString serialized in binary format. This function extracts the
 * readable text portion from that binary data.
 *
 * @param data - The raw text field from iMessage database (may be binary or plain text, or null/undefined)
 * @returns Clean, readable text string
 */
export function extractTextFromBinaryData(data: string | null | undefined): string {
  // Coerce null/undefined to empty string at the start
  if (!data) return "";

  // Check if this is binary NSArchiver/NSKeyedArchiver data
  // Primary indicators: Archiver signature strings (most reliable, encoding-independent)
  // - "streamtyped": NSKeyedArchiver stream type marker
  // - "NSKeyedArchiver": NSKeyedArchiver class name
  // - "NSArchiver": NSArchiver class name (legacy format)
  // Secondary indicators: NSArchiver class names combined with binary structure indicators
  // Note: Byte sequence checks are unreliable if SQLite encoding changes,
  // so we rely on string markers that are preserved across encodings
  // We require multiple indicators to avoid false positives from plain text containing class names
  const hasArchiverSignature =
    data.includes("streamtyped") || data.includes("NSKeyedArchiver") || data.includes("NSArchiver");

  const hasBinaryClassNames =
    data.includes("NSMutableAttributedString") ||
    data.includes("NSAttributedString") ||
    data.includes("NSMutableString") ||
    data.includes("NSString") ||
    data.includes("__kIM");

  // Check for null bytes or other non-printable control characters (indicators of binary data)
  // This helps distinguish actual binary data from plain text that mentions class names
  // We check for null bytes explicitly and scan for control characters manually to avoid regex issues
  const hasBinaryStructure = (() => {
    if (data.includes("\x00")) return true;
    // Check for control characters (0x01-0x08, 0x0E-0x1F) that indicate binary data
    for (let i = 0; i < data.length; i++) {
      const code = data.charCodeAt(i);
      if ((code >= 0x01 && code <= 0x08) || (code >= 0x0e && code <= 0x1f)) {
        return true;
      }
    }
    return false;
  })();

  // Binary data is detected if:
  // 1. Has archiver signature (streamtyped, NSKeyedArchiver, or NSArchiver), OR
  // 2. Has binary class names AND binary structure (to avoid false positives from plain text)
  const isBinaryData = hasArchiverSignature || (hasBinaryClassNames && hasBinaryStructure);

  if (!isBinaryData) {
    // Already plain text, return as-is
    return data;
  }

  // Extract printable text from the binary data
  // The actual message text is embedded as readable ASCII/UTF-8 within the binary stream
  // We use a regex to extract sequences of printable characters
  // First try longer sequences (10+ chars), then fall back to shorter sequences (4+ chars) for codes
  let matches = data.match(PRINTABLE_TEXT_REGEX);

  // If no long sequences found, try shorter sequences for OTP codes and short tokens
  if (!matches || matches.length === 0) {
    const shortPattern = /[\p{L}\p{N}\p{P}\p{S}\p{Zs}]{4,}/gu;
    matches = data.match(shortPattern);
  }

  if (!matches || matches.length === 0) {
    return "";
  }

  // Find the longest match that looks like a real message (not just binary artifacts)
  // Filter out strings that are mostly special characters or look like class names
  const isArtifact = (match: string): boolean => {
    // Remove strings that are just class names or binary artifacts
    return (
      match.includes("NSMutable") ||
      match.includes("NSAttributed") ||
      match.includes("NSDictionary") ||
      match.includes("NSNumber") ||
      match.includes("NSValue") ||
      match.includes("NSObject") ||
      match.includes("streamtyped") ||
      match.includes("NSKeyedArchiver") ||
      match.includes("NSArchiver") ||
      match.includes("__kIM") ||
      match.match(/^NS[A-Z][a-z]+$/) !== null || // NS class names like NSDictionary, NSString
      match.match(/^[A-Z][a-z]+([A-Z][a-z]+)+$/) !== null // CamelCase class names
    );
  };

  // First, try to find matches with spaces (likely to be real messages)
  const messagesWithSpaces = matches
    .filter((match) => !isArtifact(match) && match.includes(" "))
    .sort((a, b) => b.length - a.length);

  if (messagesWithSpaces.length > 0) {
    // Return the longest message with spaces
    return messagesWithSpaces[0].trim();
  }

  // Fallback: if no messages with spaces, retain short tokens that contain digits or mixed case
  // This helps preserve OTP codes and short codes that don't have spaces
  // We relax the condition to include:
  // - Pure numeric codes (digit-heavy OTPs)
  // - Alphanumeric codes with digits
  // - Mixed case identifiers
  // - Short text sequences
  const shortTokens = matches
    .filter((match) => {
      if (isArtifact(match)) return false;

      // Keep tokens that:
      // - Contain digits (likely OTP codes, including pure numeric codes), OR
      // - Have mixed case (likely codes or identifiers), OR
      // - Are reasonably short (less than 50 chars) and contain letters
      // - Are pure numeric sequences (4-8 digits, typical OTP length)
      const hasDigits = /\d/.test(match);
      const hasMixedCase = /[a-z]/.test(match) && /[A-Z]/.test(match);
      const isShortWithLetters = match.length < 50 && /[a-zA-Z]/.test(match);
      const isPureNumericOTP = /^\d{4,8}$/.test(match); // Typical OTP length

      return hasDigits || hasMixedCase || isShortWithLetters || isPureNumericOTP;
    })
    .sort((a, b) => b.length - a.length);

  if (shortTokens.length > 0) {
    // Return the longest valid short token
    return shortTokens[0].trim();
  }

  // Final fallback: if no good filtered results, return the longest match that's not an artifact
  const nonArtifacts = matches.filter((match) => !isArtifact(match));
  if (nonArtifacts.length > 0) {
    const longest = nonArtifacts.reduce((a, b) => (a.length > b.length ? a : b));
    return longest.trim();
  }

  // If everything is filtered out, return empty string
  return "";
}

/**
 * Escapes special characters in a string for safe use in SQL LIKE patterns
 * Prevents SQL injection by escaping single quotes (SQL standard)
 *
 * Note: This escapes single quotes which is the main security concern.
 * LIKE wildcards (% and _) are intentionally left unescaped to allow
 * users to use them as search patterns if desired.
 *
 * @param text - The text to escape
 * @returns Escaped text safe for use in SQL LIKE patterns
 */
export function escapeSqlLikePattern(text: string): string {
  if (!text) return "";
  // Escape single quotes by doubling them (SQL standard)
  // This prevents SQL injection while preserving LIKE wildcard functionality
  return text.replace(/'/g, "''");
}

/**
 * Helper function to find the last matching code in a message
 * @param message - The message to search in
 * @param initialMatch - The initial regex match
 * @param pattern - The regex pattern to match
 * @param digitValidator - Optional function to validate the match
 * @returns The last matching code
 */
function findLastMatchingCode(
  message: string,
  initialMatch: RegExpExecArray,
  pattern: RegExp,
  digitValidator?: (match: string) => boolean
): string {
  // Get initial code from the match
  let code = initialMatch[2];
  let lastIndex = initialMatch.index + initialMatch[0].length; // Fix: Use full match length instead of just +1

  let nextMatch: RegExpExecArray | null;
  while (
    (nextMatch = pattern.exec(message.substring(lastIndex))) !== null &&
    (!digitValidator || digitValidator(nextMatch[2]))
  ) {
    code = nextMatch[2]; // Update code with each new match
    lastIndex += nextMatch.index + nextMatch[0].length; // Fix: Use full match length instead of just +1
  }

  return code; // Return the last found code
}
