import { AxiosResponse } from "axios";
import { $cookies, addParsedCookie } from "~/store/cookies";
import { Cookies, ParsedCookie, parsedCookieSchema } from "~/types";

/**
 * Parses a raw "Set-Cookie" header string into our structured ParsedCookie type.
 * Uses Zod to validate the final object.
 */
export function parseCookie(rawCookie: string): ParsedCookie | null {
  try {
    const parts = rawCookie.split(";").map((part) => part.trim());
    const [name, value] = parts.shift()!.split("="); // Get the name/value pair

    const options: Record<string, string | boolean> = {};
    for (const part of parts) {
      const parts = part.split("=");
      let key = parts[0];
      const val = parts[1];
      // Normalize key to lowercase to easily find it
      key = key.toLowerCase();
      // If there's no value, it's a flag like "HttpOnly"
      options[key] = val === undefined ? true : val;
    }

    const cookieObject = {
      cookieName: name,
      cookieValue: value,
      options: {
        maxAge: options["max-age"] ? parseInt(String(options["max-age"])) : undefined,
        expires: options.expires ? new Date(String(options.expires)) : undefined,
        httpOnly: !!options.httponly,
        path: String(options.path ?? "/"), // Default path is typically "/"
        domain: options.domain ? String(options.domain) : undefined,
        secure: !!options.secure,
        sameSite: options.samesite,
      },
    };

    // Use our schema to validate and return the final, typed object.
    return parsedCookieSchema.parse(cookieObject);
  } catch (error) {
    console.error("Failed to parse cookie:", rawCookie, error);
    return null;
  }
}

/**
 * Removes expired cookies from the store.
 */
export function removeExpiredCookies() {
  const allCookies = $cookies.get();
  const now = new Date();
  let hasChanges = false;

  const cleanedCookies: Cookies = {};

  for (const [domain, cookies] of Object.entries(allCookies)) {
    const validCookies = cookies.filter((cookie) => {
      // Keep if no expiration set
      if (!cookie.options.expires && cookie.options.maxAge === undefined) {
        return true;
      }

      // Remove if expired by date
      if (cookie.options.expires && cookie.options.expires < now) {
        hasChanges = true;
        return false;
      }

      // Remove if expired by maxAge
      if (cookie.options.maxAge !== undefined && cookie.options.maxAge <= 0) {
        hasChanges = true;
        return false;
      }

      return true;
    });

    // Only keep domains that still have cookies
    if (validCookies.length > 0) {
      cleanedCookies[domain] = validCookies;
    } else {
      hasChanges = true;
    }
  }

  if (hasChanges) {
    $cookies.set(cleanedCookies);
  }
}

/**
 * Checks if a cookie's domain matches the request domain according to RFC 6265.
 *
 * A cookie domain matches a request domain if:
 * 1. They are exactly equal (e.g., "example.com" matches "example.com")
 * 2. The request domain is a subdomain of the cookie domain
 *    (e.g., "api.example.com" matches cookie domain ".example.com" or "example.com")
 *
 * @param cookieDomain - The domain attribute from the cookie (may have leading dot)
 * @param requestDomain - The hostname of the request URL
 * @returns true if the cookie should be sent with this request, false otherwise
 *
 * @example
 * ```typescript
 * domainMatches("example.com", "example.com")        // true - exact match
 * domainMatches(".example.com", "api.example.com")   // true - subdomain match
 * domainMatches("example.com", "api.example.com")    // true - subdomain match
 * domainMatches("example.com", "badexample.com")     // false - different domain
 * domainMatches("api.example.com", "example.com")    // false - cookie is more specific
 * ```
 */
function domainMatches(cookieDomain: string, requestDomain: string): boolean {
  const normalizedCookieDomain = cookieDomain.startsWith(".") ? cookieDomain.slice(1) : cookieDomain;

  if (requestDomain === normalizedCookieDomain) return true;
  if (requestDomain.endsWith("." + normalizedCookieDomain)) return true;
  return false;
}

/**
 * Checks if a request path matches a cookie path according to RFC 6265.
 * A cookie path matches if:
 * 1. The request path equals the cookie path (exact match)
 * 2. The request path starts with the cookie path followed by "/" (prefix match)
 *
 * @param cookiePath - The path attribute from the cookie
 * @param requestPath - The pathname of the request URL
 * @returns true if the cookie should be sent with this request, false otherwise
 *
 * @example
 * ```typescript
 * pathMatches("/api", "/api")           // true - exact match
 * pathMatches("/api", "/api/users")    // true - prefix match
 * pathMatches("/api", "/api-other")    // false - not a valid prefix
 * ```
 */
function pathMatches(cookiePath: string, requestPath: string): boolean {
  // Exact match
  if (cookiePath === requestPath) return true;

  // Prefix match: requestPath must start with cookiePath + "/"
  // This prevents "/api" from matching "/api-other"
  if (requestPath.startsWith(cookiePath + "/")) return true;

  return false;
}

/**
 * Gathers all relevant cookies from the store for an outgoing request.
 * @param finalUrl The full URL of the request.
 * @returns An object with a formatted `Cookie` header, or undefined if no cookies match.
 */
export function prepareCookieHeader(finalUrl: string): { Cookie: string } | undefined {
  if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
    return undefined;
  }

  removeExpiredCookies();

  const allCookies = $cookies.get();
  const url = new URL(finalUrl);
  const requestDomain = url.hostname;
  const requestPath = url.pathname;

  let cookieString = "";

  for (const domain in allCookies) {
    if (domainMatches(domain, requestDomain)) {
      allCookies[domain].forEach((cookie) => {
        // Check Secure flag
        if (cookie.options.secure && url.protocol !== "https:") {
          return; // Skip secure cookie on non-HTTPS request
        }

        // Check path - now using RFC 6265 compliant path matching
        const cookiePath = cookie.options.path || "/";
        if (pathMatches(cookiePath, requestPath)) {
          cookieString += `${cookie.cookieName}=${cookie.cookieValue}; `;
        }
      });
    }
  }

  if (!cookieString) return undefined;
  return { Cookie: cookieString.slice(0, -2) };
}

/**
 * Finds, parses, and saves any `Set-Cookie` headers from an API response.
 * @param response The response object from an Axios request.
 */
export function handleSetCookieHeaders(response: AxiosResponse) {
  const setCookieHeader = response.headers["set-cookie"];
  if (setCookieHeader) {
    const rawCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const rawCookie of rawCookies) {
      const parsed = parseCookie(rawCookie);

      // --- THIS CHECK IS CRUCIAL ---
      // Only try to add the cookie if parsing was successful and returned a valid object.
      if (parsed) {
        addParsedCookie(parsed);
      }
    }
  }
}
