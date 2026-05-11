import { LookBackUnitType } from "./types";

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
      /(code\s*[:：]|is\s*[:：]|码|use code|passcode\s*[:：]|autoriza(?:ca|çã)o\s*[:：]|c(?:o|ó)digo\s*[:：])\s*(\d{4,8})($|\s|\\R|\t|\b|\.|,)/i.exec(
        message
      )) !== null
  ) {
    // Use the helper function to find the last match
    code = findLastMatchingCode(
      message,
      m,
      /(code\s*[:：]|is\s*[:：]|码|use code|passcode\s*[:：]|autoriza(?:ca|çã)o\s*[:：]|c(?:o|ó)digo\s*[:：])\s*(\d{4,8})($|\s|\\R|\t|\b|\.|,)/i
    );
  } else if (
    // Modified to match alphanumeric codes
    (m =
      /(code\s*[:：]|is\s*[:：]|码|use code|passcode\s*[:：]|autoriza(?:ca|çã)o\s*[:：]|c(?:o|ó)digo\s*[:：])\s*([A-Z0-9]{4,8})($|\s|\\R|\t|\b|\.|,)/i.exec(
        message
      )) !== null
  ) {
    // Use the helper function to find the last match
    code = findLastMatchingCode(
      message,
      m,
      /(code\s*[:：]|is\s*[:：]|码|use code|passcode\s*[:：]|autoriza(?:ca|çã)o\s*[:：]|c(?:o|ó)digo\s*[:：])\s*([A-Z0-9]{4,8})($|\s|\\R|\t|\b|\.|,)/i
    );
  } else {
    // more generic, brute force patterns
    const phoneRegex = new RegExp(
      /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/,
      "ig"
    );

    message = message.replaceAll(phoneRegex, "");

    if ((m = /(^|\s|\\R|\t|\b|G-|[:：])(\d{5,8})($|\s|\\R|\t|\b|\.|,)/.exec(message)) !== null) {
      code = m[2];
    } else if ((m = /\b(?=[A-Z]*[0-9])(?=[0-9]*[A-Z])[0-9A-Z]{3,8}\b/.exec(message)) !== null) {
      code = m[0];
    } else if ((m = /(^|code[:：]|is[:：]|\b)\s*(\d{3})-(\d{3})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
      const first = m[2];
      const second = m[3];
      code = `${first}${second}`;
    } else if ((m = /(code|is)[:：]?\s*(\d{3,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
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
 */
function fixQuotedPrintableUrl(url: string): string {
  if (!url) return url;

  // Handle the specific case where a URL is cut off with an equal sign
  if (url.endsWith("=")) {
    // Remove trailing equals sign that's part of quoted-printable line continuation
    url = url.slice(0, -1);
  }

  // Fix URLs with embedded quoted-printable encoding
  // Only process =XX patterns that are clearly quoted-printable line breaks:
  // - Followed by whitespace or newline (quoted-printable soft line breaks)
  // - At the very end of the URL (before any trailing =)
  // We do NOT process =XX when followed by alphanumeric characters,
  // as those are regular URL query parameters (e.g., token=abc123)
  return url.replace(/=([0-9A-Fa-f]{2})(?=[\s\r\n]|$)/g, (_, hex) => {
    try {
      const charCode = parseInt(hex, 16);
      // Only decode if it results in a printable ASCII character (32-126)
      // This ensures we're decoding quoted-printable, not corrupting URL params
      if (charCode >= 32 && charCode <= 126) {
        return String.fromCharCode(charCode);
      }
      return `=${hex}`; // Keep original if not a valid printable char
    } catch (e) {
      return `=${hex}`; // Keep original if parsing fails
    }
  });
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
    "temporary access",
    "temp-access",
    "temporary",
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
        // Check for specific patterns like token/auth first for verification
        if (
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
        // Then check sign-in keywords in URL
        else if (signInKeywords.some((keyword) => lowerUrl.includes(keyword))) {
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

    // Check sign-in keywords first (they take priority when both are present)
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
 * @param data - The raw text field from iMessage database (may be binary or plain text)
 * @returns Clean, readable text string
 */
export function extractTextFromBinaryData(data: string): string {
  if (!data) return "";

  // Check if this is binary NSArchiver data (starts with specific markers)
  // NSKeyedArchiver typically starts with bytes like \x04\x0B or contains "streamtyped"
  // Also check for common class name markers that indicate binary data
  // But be careful not to misidentify plain text that mentions these class names
  const hasBinaryMarkers =
    data.includes("streamtyped") ||
    data.includes("\x04\x0B") ||
    (data.includes("\x00") && /NS(?:Keyed|Mutable)?Archiver/.test(data)) ||
    (data.includes("\x00") && /NS(?:Mutable|Attributed)String/.test(data));

  if (!hasBinaryMarkers) {
    // Already plain text, return as-is
    return data;
  }

  // Extract printable text from the binary data
  // The actual message text is embedded as readable ASCII/UTF-8 within the binary stream
  // We use a regex to extract sequences of printable characters (including Unicode)
  // Match printable ASCII, Latin-1, and Unicode characters (excluding control chars)
  const printableTextRegex = /[\x20-\x7E\xA0-\uFFFF]{10,}/g;
  const matches = data.match(printableTextRegex);

  if (!matches || matches.length === 0) {
    return "";
  }

  // Find the longest match that looks like a real message (not just binary artifacts)
  // Filter out strings that are mostly special characters or look like class names
  const filtered = matches
    .filter((match) => {
      // Remove strings that are just class names or binary artifacts
      if (
        match.includes("NSMutable") ||
        match.includes("NSAttributed") ||
        match.includes("NSKeyedArchiver") ||
        match.includes("NSArchiver") ||
        match.includes("NSMutableString") ||
        match.includes("NSString") ||
        match.includes("__kIM") ||
        match.match(/^NS[A-Z][a-zA-Z]*$/) || // NS class names
        match.match(/^[A-Z][a-z]+([A-Z][a-z]+)+$/) // CamelCase class names
      ) {
        return false;
      }
      // Keep strings that have spaces (likely to be real sentences)
      // OR strings that look like codes (alphanumeric with digits)
      return match.includes(" ") || /\d/.test(match);
    })
    .sort((a, b) => {
      // Prefer strings with spaces, then by length
      const aHasSpaces = a.includes(" ");
      const bHasSpaces = b.includes(" ");
      if (aHasSpaces && !bHasSpaces) return -1;
      if (!aHasSpaces && bHasSpaces) return 1;
      return b.length - a.length;
    });

  if (filtered.length > 0) {
    // Return the longest filtered string, trimmed
    return filtered[0].trim();
  }

  // Fallback: if no good filtered results, filter out class names from longest match
  const longest = matches.reduce((a, b) => (a.length > b.length ? a : b));
  // Check if the longest match contains class names - if so, try to extract just the message part
  if (
    longest.includes("NSMutable") ||
    longest.includes("NSAttributed") ||
    longest.includes("NSKeyedArchiver") ||
    longest.includes("NSArchiver") ||
    longest.includes("__kIM")
  ) {
    // Try to find a substring that doesn't contain class names
    const withoutClassNames = longest
      .split(/\s*(?:NS(?:Mutable|Attributed|KeyedArchiver|Archiver|MutableString|String)|__kIM)\s*/)
      .filter((part) => part.length > 0 && (part.includes(" ") || /\d/.test(part)))
      .sort((a, b) => {
        const aHasSpaces = a.includes(" ");
        const bHasSpaces = b.includes(" ");
        if (aHasSpaces && !bHasSpaces) return -1;
        if (!aHasSpaces && bHasSpaces) return 1;
        return b.length - a.length;
      });
    if (withoutClassNames.length > 0) {
      return withoutClassNames[0].trim();
    }
  }
  return longest.trim();
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
